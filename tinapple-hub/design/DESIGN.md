# Tinapple Material Dashboard — Material 3 Expressive
Desktop, 1440px. Preserve the existing React component hierarchy, all routes and widget positions. This is a visual restyle, never a new information architecture.
## Fixed architecture
Left collapsible Sidebar navigation: Dashboard, Services, App Store, Guides, Hardware, Terminal, Error Logger, Settings; conditional Installer. Keep quick actions Server Tools, Tailscale, Logs and Proton VPN and the bottom profile/theme/pin controls. Top status bar contains hostname, LAN/Tailscale IPs, uptime, load and update notification. Keep HomarrBoard/HomarrCanvas user-saved grid coordinates and responsive breakpoints. Keep telemetry, services, QuickConnect/QR, transfers, manga and Tor widgets in their existing slots. Floating service dock stays at bottom. Dialogs retain all actions and callbacks.
## Color roles
Use --md-sys-color-* custom properties and semantic Tailwind aliases: surface, surface-dim, surface-bright, surface-container-lowest, surface-container-low, surface-container, surface-container-high, surface-container-highest, primary, on-primary, primary-container, on-primary-container, secondary-container, on-secondary-container, on-surface, on-surface-variant, outline, outline-variant, error, on-error.
Wallpaper/seed generates HCT tonal colors using Material Color Utilities or existing Matugen. Default seed #38bdf8; primary at dark tone 80, on-primary 20, primary-container 30, on-primary-container 90. Dark matte foundation lowest #05070f, low #0c121f, container #101828, high #152034, highest #1c2940. No electric blue glow, glass gradients or pure black surfaces. Status success/error remain semantic, not wallpaper accents. Light mode must use corresponding light tonal roles.
## Surfaces and geometry
Tonal elevation levels 0–5, subtle outline-variant 1px borders; no heavy outer shadow. Cards radius 28px, internal padding 16px and nested radius 12px (R_inner = R_outer - padding). Small cards 24px/12px. Matte anti-glare readable panels. Floating dock uses surface-container-high and rounded-full. Drawers surface-container-high, 28px corners.
## Components
Navigation indicator rounded-full primary at 15% with on-surface/primary labels. Keep existing rail widths and collapse behavior; 200–300ms restrained spring motion, reduced-motion honored. Real M3 switch track 52x32px; off thumb 16px, on thumb 24px, pressed 28px, touch area minimum 40x40px. Disabled, pending, focus-visible and error states. Buttons Filled primary/on-primary, Tonal secondary-container/on-secondary-container, Outlined outline; 36/40px controls with 40–48px hit targets. No extra buttons or changed commands.
## Typography
Locally bundled Roboto Flex with Google Sans fallback. Headlines 24/32 medium, title-large 22/28, title-medium 16/24 medium, body 14/20, labels 12/16 medium. Performance values and timestamps use tabular numerals, optional monospace. Keep terminal/code/log fonts monospace. Avoid all-caps technical labels as the default.
## Accessibility
4.5:1 body contrast, visible 2px primary focus ring with offset. Switch role and aria-checked, keyboard Space/Enter, accessible names. Modal focus and Escape preserved. No hover-only critical action. Use contrast-safe colors for every seed.
## Requested screens
1 Master Bento: unchanged shell, telemetry top, services and QuickConnect/QR, transfers, manga/Tor lower, floating dock.
2 Services: same shell, category filter/search, service cards with identity/status/switch/launch/log actions.
3 Hardware: same shell, CPU/GPU dials, fan curves, battery charge protection slider.
4 Appearance: existing dashboard behind a right drawer; seed/wallpaper swatches, tone circles, blur and scale controls, tonal elevation preview.
## Variant exercise
Component states only: switch off/on/pressed/disabled; cards resting/hover/focus; rail expanded/collapsed. No grid rearrangement.

