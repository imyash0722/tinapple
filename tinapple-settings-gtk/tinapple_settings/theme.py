"""
Tinapple OS Modern & Sleek Yellows and Greens Theme for GTK4 & Libadwaita
Palette:
- Background: Deep obsidian forest #0c110e
- Card Panel: #131a15
- Floating / Hover: #18221c
- Border: #27382e
- Solar Yellow (Accent): #facc15
- Soft Yellow (Hover): #fde047
- Emerald Green (Primary Action): #10b981
- Mint Green (Success): #2ed573
- Off-white Mint Text: #f0fdf4
- Muted Sage Text: #86a393
"""

import gi
gi.require_version('Gtk', '4.0')
from gi.repository import Gtk, Gdk

CSS_DATA = """
/* Tinapple Modern & Sleek Yellows & Greens Design System */

window, .background {
    background-color: #0c110e;
    color: #f0fdf4;
    font-family: 'JetBrainsMono Nerd Font', 'JetBrains Mono', -apple-system, system-ui, sans-serif;
}

headerbar {
    background-color: #131a15;
    border-bottom: 1px solid #27382e;
    color: #f0fdf4;
    padding: 6px 12px;
}

headerbar .title {
    font-weight: 700;
    color: #facc15;
    letter-spacing: 0.5px;
}

headerbar .subtitle {
    color: #86a393;
    font-size: 11px;
}

/* Preferences Cards and Groups */
preferencespage {
    background-color: #0c110e;
}

preferencesgroup > box {
    margin-bottom: 18px;
}

preferencesgroup .title {
    color: #facc15;
    font-size: 13px;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.8px;
    margin-bottom: 6px;
    margin-left: 6px;
}

preferencesgroup .description {
    color: #86a393;
    font-size: 12px;
    margin-bottom: 10px;
    margin-left: 6px;
}

list.boxed-list {
    background-color: #131a15;
    border: 1px solid #27382e;
    border-radius: 12px;
    box-shadow: 0 4px 14px rgba(0, 0, 0, 0.35);
}

list.boxed-list row {
    border-bottom: 1px solid #1c2720;
    padding: 12px 16px;
    transition: background-color 150ms ease;
}

list.boxed-list row:last-child {
    border-bottom: none;
}

list.boxed-list row:hover {
    background-color: #18221c;
}

/* ActionRow & SwitchRow Typography */
actionrow .title, switchrow .title, comborow .title, entryrow .title, expanderrow .title {
    color: #f0fdf4;
    font-size: 13.5px;
    font-weight: 600;
}

actionrow .subtitle, switchrow .subtitle, comborow .subtitle, expanderrow .subtitle {
    color: #86a393;
    font-size: 11.5px;
    line-height: 1.4;
    margin-top: 3px;
}

/* Switch Styling (Yellow & Green) */
switch {
    background-color: #1f2c23;
    border: 1px solid #27382e;
    border-radius: 14px;
}

switch:checked {
    background-color: #10b981;
    border-color: #2ed573;
}

switch slider {
    background-color: #f0fdf4;
    border-radius: 50%;
    margin: 2px;
    min-width: 18px;
    min-height: 18px;
}

switch:checked slider {
    background-color: #061a10;
}

/* Buttons */
button {
    background-color: #18221c;
    border: 1px solid #27382e;
    border-radius: 8px;
    color: #f0fdf4;
    font-weight: 600;
    padding: 8px 16px;
    transition: all 150ms ease;
}

button:hover {
    background-color: #1f2d25;
    border-color: #10b981;
    color: #ffffff;
}

button.suggested-action {
    background-color: #10b981;
    border-color: #2ed573;
    color: #061a10;
    font-weight: 700;
}

button.suggested-action:hover {
    background-color: #34d399;
    color: #061a10;
}

button.accent-action {
    background-color: #facc15;
    border-color: #fde047;
    color: #061a10;
    font-weight: 700;
}

button.accent-action:hover {
    background-color: #fde047;
    color: #061a10;
}

button.destructive-action {
    background-color: #ef4444;
    border-color: #f87171;
    color: #ffffff;
}

/* Step Bar / Progress Indicator */
.step-pill {
    padding: 6px 14px;
    border-radius: 16px;
    font-size: 12px;
    font-weight: 600;
    margin: 2px 4px;
    border: 1px solid #27382e;
    background-color: #131a15;
    color: #86a393;
    transition: all 150ms ease;
}

.step-pill.active {
    background-color: #facc15;
    border-color: #fde047;
    color: #061a10;
    font-weight: 700;
}

.step-pill.completed {
    background-color: #10b981;
    border-color: #2ed573;
    color: #061a10;
}

/* Entry / Input fields */
entry {
    background-color: #0f1612;
    border: 1px solid #27382e;
    border-radius: 6px;
    color: #f0fdf4;
    padding: 6px 10px;
}

entry:focus {
    border-color: #10b981;
    box-shadow: 0 0 0 2px rgba(16, 185, 129, 0.25);
}

/* Badges and Chips */
.badge-yellow {
    background-color: #383010;
    color: #facc15;
    border: 1px solid #574815;
    border-radius: 6px;
    padding: 2px 8px;
    font-size: 11px;
    font-weight: 600;
}

.badge-green {
    background-color: #143322;
    color: #2ed573;
    border: 1px solid #1a492f;
    border-radius: 6px;
    padding: 2px 8px;
    font-size: 11px;
    font-weight: 600;
}

/* Sidebar navigation */
stacksidebar list {
    background-color: #0c110e;
    border-right: 1px solid #27382e;
}

stacksidebar row {
    padding: 10px 14px;
    border-radius: 8px;
    margin: 2px 6px;
    color: #86a393;
    font-weight: 600;
}

stacksidebar row:hover {
    background-color: #131a15;
    color: #f0fdf4;
}

stacksidebar row:selected {
    background-color: #facc15;
    color: #061a10;
    font-weight: 700;
}
"""

def apply_theme():
    """Injects custom CSS provider globally into GTK4 display."""
    css_provider = Gtk.CssProvider()
    css_provider.load_from_data(CSS_DATA.encode('utf-8'))
    display = Gdk.Display.get_default()
    if display:
        Gtk.StyleContext.add_provider_for_display(
            display,
            css_provider,
            Gtk.STYLE_PROVIDER_PRIORITY_APPLICATION
        )
