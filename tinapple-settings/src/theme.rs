use egui::{Color32, CornerRadius, Stroke, Visuals};

// Tinapple Modern & Sleek Monochrome Matugen (Near Black & White with Metallic Tin) Design System
// Backgrounds
pub const COLOR_BG: Color32 = Color32::from_rgb(0x0b, 0x0c, 0x0e);          // Deep obsidian black (#0b0c0e)
pub const COLOR_BG_PANEL: Color32 = Color32::from_rgb(0x14, 0x16, 0x1a);    // Sleek dark charcoal panel (#14161a)
pub const COLOR_BG_FLOAT: Color32 = Color32::from_rgb(0x1c, 0x1f, 0x26);    // Subtle raised card (#1c1f26)
pub const COLOR_BG_HIGHLIGHT: Color32 = Color32::from_rgb(0x28, 0x2c, 0x36);// Focused/Hovered item (#282c36)
pub const COLOR_BORDER: Color32 = Color32::from_rgb(0x33, 0x37, 0x42);      // Subtle metallic stroke (#333742)

// Metallic Tin / Silver (Accent & Active Highlights)
pub const COLOR_ACCENT: Color32 = Color32::from_rgb(0xd4, 0xd8, 0xe2);      // Bright metallic tin silver (#d4d8e2)
pub const COLOR_ACCENT_HOVER: Color32 = Color32::from_rgb(0xff, 0xff, 0xff);// Pure specular white (#ffffff)
pub const COLOR_ACCENT_MUTED: Color32 = Color32::from_rgb(0x2a, 0x2e, 0x38);// Dark pewter badge background

// Steel / Silver (Primary Action & Status)
pub const COLOR_PRIMARY: Color32 = Color32::from_rgb(0xe2, 0xe5, 0xec);     // Polished silver/white (#e2e5ec)
pub const COLOR_PRIMARY_HOVER: Color32 = Color32::from_rgb(0xff, 0xff, 0xff);// Pure white (#ffffff)
pub const COLOR_SUCCESS: Color32 = Color32::from_rgb(0xc8, 0xcc, 0xd6);     // Muted silver (#c8ccd6)
pub const COLOR_SUCCESS_MUTED: Color32 = Color32::from_rgb(0x22, 0x26, 0x2e);// Dark slate badge background

// Danger / Alerts
pub const COLOR_DANGER: Color32 = Color32::from_rgb(0xe0, 0x6c, 0x75);      // Muted rose-silver (#e06c75)

// Typography
pub const COLOR_TEXT_MAIN: Color32 = Color32::from_rgb(0xf0, 0xf2, 0xf7);   // Platinum white (#f0f2f7)
pub const COLOR_TEXT_MUTED: Color32 = Color32::from_rgb(0x8e, 0x95, 0xa5);  // Neutral tin gray (#8e95a5)
pub const COLOR_TEXT_DARK: Color32 = Color32::from_rgb(0x0b, 0x0c, 0x0e);   // Deep contrast obsidian on bright pills

pub fn apply_tinapple_theme(ctx: &egui::Context) {
    setup_fonts(ctx);
    let mut visuals = Visuals::dark();

    visuals.override_text_color = Some(COLOR_TEXT_MAIN);
    visuals.panel_fill = COLOR_BG;
    visuals.window_fill = COLOR_BG_PANEL;
    visuals.extreme_bg_color = Color32::from_rgb(0x07, 0x08, 0x0a);

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

    visuals.widgets.active.bg_fill = COLOR_PRIMARY;
    visuals.widgets.active.bg_stroke = Stroke::new(1.5, COLOR_PRIMARY);
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
