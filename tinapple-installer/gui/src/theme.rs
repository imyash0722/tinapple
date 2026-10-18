use egui::{Color32, CornerRadius, Stroke, Visuals};

// Tinapple Obsidian & Warm Pine Gold Design System
// High-contrast, accessibility-focused colors designed for zero unreadable text

// Backgrounds
pub const COLOR_BG: Color32 = Color32::from_rgb(0x06, 0x07, 0x09);          // Obsidian black (#060709)
pub const COLOR_BG_PANEL: Color32 = Color32::from_rgb(0x0e, 0x11, 0x16);    // Dark charcoal panel (#0e1116)
pub const COLOR_BG_FLOAT: Color32 = Color32::from_rgb(0x16, 0x1a, 0x22);    // Subtle raised card (#161a22)
pub const COLOR_BG_HIGHLIGHT: Color32 = Color32::from_rgb(0x22, 0x27, 0x33);// Focused/Hovered item (#222733)
pub const COLOR_BORDER: Color32 = Color32::from_rgb(0x35, 0x3c, 0x4a);      // Crisp metallic border (#353c4a)

// Warm Pine Gold (Primary Accent & Active Highlights)
pub const COLOR_ACCENT: Color32 = Color32::from_rgb(0xe5, 0xb5, 0x67);      // Warm pine gold (#e5b567)
pub const COLOR_ACCENT_HOVER: Color32 = Color32::from_rgb(0xf5, 0xc7, 0x7e);// Bright gold (#f5c77e)
pub const COLOR_ACCENT_MUTED: Color32 = Color32::from_rgb(0x28, 0x22, 0x14);// Dark gold badge background

// Palm Sage (Success, Finished Steps & Badges)
pub const COLOR_SUCCESS: Color32 = Color32::from_rgb(0x7e, 0xc7, 0x89);     // Palm sage green (#7ec789)
pub const COLOR_SUCCESS_MUTED: Color32 = Color32::from_rgb(0x13, 0x23, 0x16);// Dark sage badge background

// Primary Steel & Whites
pub const COLOR_PRIMARY: Color32 = Color32::from_rgb(0xe5, 0xb5, 0x67);     // Primary button color
pub const COLOR_PRIMARY_HOVER: Color32 = Color32::from_rgb(0xf5, 0xc7, 0x7e);

// Danger / Alerts
pub const COLOR_DANGER: Color32 = Color32::from_rgb(0xe0, 0x6c, 0x75);      // Soft coral red (#e06c75)

// Typography - Guaranteed 100% Contrast
pub const COLOR_TEXT_MAIN: Color32 = Color32::from_rgb(0xf5, 0xf6, 0xfa);   // Crisp platinum white (#f5f6fa)
pub const COLOR_TEXT_MUTED: Color32 = Color32::from_rgb(0xa4, 0xad, 0xbe);  // Readable silver gray (#a4adbe)
pub const COLOR_TEXT_DARK: Color32 = Color32::from_rgb(0x06, 0x07, 0x09);   // Deep obsidian on bright pills

pub fn apply_tinapple_theme(ctx: &egui::Context) {
    setup_fonts(ctx);
    let mut visuals = Visuals::dark();

    visuals.override_text_color = Some(COLOR_TEXT_MAIN);
    visuals.panel_fill = COLOR_BG;
    visuals.window_fill = COLOR_BG_PANEL;
    visuals.extreme_bg_color = Color32::from_rgb(0x03, 0x04, 0x06);

    visuals.widgets.noninteractive.bg_fill = COLOR_BG_PANEL;
    visuals.widgets.noninteractive.bg_stroke = Stroke::new(1.0, COLOR_BORDER);
    visuals.widgets.noninteractive.corner_radius = CornerRadius::same(6);
    visuals.widgets.noninteractive.fg_stroke = Stroke::new(1.0, COLOR_TEXT_MAIN);

    visuals.widgets.inactive.bg_fill = COLOR_BG_FLOAT;
    visuals.widgets.inactive.bg_stroke = Stroke::new(1.0, COLOR_BORDER);
    visuals.widgets.inactive.corner_radius = CornerRadius::same(6);
    visuals.widgets.inactive.fg_stroke = Stroke::new(1.0, COLOR_TEXT_MAIN);

    visuals.widgets.hovered.bg_fill = COLOR_BG_HIGHLIGHT;
    visuals.widgets.hovered.bg_stroke = Stroke::new(1.5, COLOR_ACCENT);
    visuals.widgets.hovered.corner_radius = CornerRadius::same(6);
    visuals.widgets.hovered.fg_stroke = Stroke::new(1.0, Color32::WHITE);

    visuals.widgets.active.bg_fill = COLOR_ACCENT;
    visuals.widgets.active.bg_stroke = Stroke::new(1.5, COLOR_ACCENT);
    visuals.widgets.active.corner_radius = CornerRadius::same(6);
    visuals.widgets.active.fg_stroke = Stroke::new(1.0, COLOR_TEXT_DARK);

    visuals.selection.bg_fill = COLOR_ACCENT;
    visuals.selection.stroke = Stroke::new(1.0, COLOR_ACCENT);

    ctx.set_visuals(visuals);
}

pub fn setup_fonts(ctx: &egui::Context) {
    let mut fonts = egui::FontDefinitions::default();
    fonts.font_data.insert(
        "jetbrains_nerd".to_owned(),
        std::sync::Arc::new(egui::FontData::from_static(include_bytes!("../fonts/JetBrainsMonoNerdFont-Regular.ttf"))),
    );
    fonts
        .families
        .entry(egui::FontFamily::Proportional)
        .or_default()
        .insert(0, "jetbrains_nerd".to_owned());
    fonts
        .families
        .entry(egui::FontFamily::Monospace)
        .or_default()
        .insert(0, "jetbrains_nerd".to_owned());
    ctx.set_fonts(fonts);
}
