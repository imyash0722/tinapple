# S7: Master Design System & UX Research Study

## Overview
This document compiles the comprehensive 30-minute deep-dive study into modern web design, research papers, human cognition heuristics, and UI engineering best practices. The goal is to provide a permanent design reference and concrete architectural blueprint for the **Tinapple Hub** and homelab web applications.

---

## 1. Anatomy of Elite Websites: What Makes Them World-Class

### A. Linear (`linear.app`) & Raycast (`raycast.com`)
* **Philosophy**: Speed as the primary UI feature. Extreme data density balanced by ruthless visual quietness.
* **Key Techniques**:
  * **Preattentive Status Indicators**: Subtle 6px-8px glowing circular LEDs instead of oversized colored banners.
  * **Keyboard-First Ergonomics**: Instant `<kbd>` shortcuts, command palette (`Cmd+K`), and zero-latency state transitions.
  * **Subtle Layering**: 1px micro-borders (`rgba(255, 255, 255, 0.08)`) with semi-transparent tinted container fills rather than thick opaque dividers.
  * **Typography**: Monospace tabular numerals (`tabular-nums`) for all timestamps, ports, and telemetry metrics to prevent horizontal layout jank during real-time updates.

### B. BentoGrids (`bentogrids.com`) & Apple Feature Showcases
* **Philosophy**: Modular, asymmetric visual rhythm that breaks the monotony of uniform card grids.
* **Key Techniques**:
  * **Hierarchical Spanning**: High-priority services (e.g., Jellyfin media player, qBittorrent active downloads) occupy `col-span-6` or `col-span-8` (2x2), while auxiliary background utilities (e.g., Bazarr, Prowlarr) sit in `col-span-3` (1x1).
  * **Consistent Corner Radii**: Nested containers follow the geometric radius formula: $R_{outer} = R_{inner} + Padding$. If a card has $R=16\text{px}$ and $12\text{px}$ padding, inner elements use $R=8\text{px}$ to maintain parallel curvature.
  * **Zero Dead Space**: Tiles stretch edge-to-edge within a CSS grid with uniform `gap-4` (16px) or `gap-6` (24px).

### C. Dark Mode Design (`darkmodedesign.com`) & Deep OLED Palettes
* **Philosophy**: True midnight aesthetics optimized for dark environments and low eye strain.
* **Key Techniques**:
  * **Avoid Pure `#000000` for Cards**: Background is deep navy/black (`#050814` to `#090e18`), while elevated cards use tone-tinted containers (`#0c121f` to `#152034`). Pure `#000` text-on-background causes smearing on OLED displays when scrolling.
  * **Lightness Encodes Elevation**: In dark themes, drop shadows are virtually invisible. Material Design 3 (M3) tonal elevation solves this: higher elements are rendered with slightly lighter surfaces.
  * **Active Glow Highlights**: Soft, diffused radial glows (`box-shadow: 0 0 16px rgba(56, 189, 248, 0.25)`) used sparingly on focused or active states to guide visual attention.

---

## 2. Foundational Research Papers & Human Cognition Laws

### A. Nielsen Norman Group (NN/g): Operational Dashboard Heuristics
* **The Car Dashboard Metaphor**: An operational homelab dashboard must convey critical status (health, load, network connectivity) within 250 milliseconds. The user should not have to "read" or "calculate" state.
* **Progressive Disclosure**:
  * *Level 1 (Glanceable Surface)*: Service name, online/offline status dot, primary port/path, 1-click launch.
  * *Level 2 (In-Context Expansion)*: Quick action popovers, config edit, log preview.
  * *Level 3 (Full Immersion)*: Dedicated full-page route (`/guides/<service>`, `/terminal`) without nested modal inception.
* **Elimination of Superfluous Graphics**: Strip out uninformative decorative badges and repetitive icons. Every visual element must carry information.

### B. Laws of UX in Interaction Design
| Law | Principle | Application in Tinapple |
| :--- | :--- | :--- |
| **Fitts's Law** | Target acquisition time is a function of distance and target size. | Main action buttons ("Open", "Start", "Guide") have a minimum hit target of $36\text{px} \times 36\text{px}$ and generous click padding. |
| **Hick's Law** | Decision time increases logarithmically with the number of options. | Replace massive multi-level dropdowns with search-filtered command palettes and categorized bento sections. |
| **Miller's Law** | Working memory holds $7 \pm 2$ chunks. | Telemetry and services are chunked into 4-6 distinct clusters (Media, Downloads, Storage, Network, System). |
| **Gestalt Proximity** | Items close together are perceived as unified. | Form labels sit directly atop their inputs (4px gap); button groups share a unified pill container. |
| **Gestalt Common Region** | Enclosed boundaries establish belonging. | Bento card containers clearly demarcate where one service ends and another begins. |

### C. Refactoring UI (Adam Wathan & Steve Schoger)
1. **The Container Trap**: Never design sidebars and multi-nested wrapper boxes before core functionality is defined. Navigation must serve the feature, not constrain it.
2. **De-emphasize Secondary Elements**: Instead of making primary text larger and louder, make secondary text quieter (e.g., `text-zinc-500` and `text-[11px]`).
3. **Invert Line Heights**:
   * Large Headings ($>24\text{px}$): Tight line-height (`leading-tight`, $\sim 1.15$).
   * Small Body Text ($12\text{px}-14\text{px}$): Relaxed line-height (`leading-relaxed`, $\sim 1.5 - 1.6$).
4. **Spacing Scales**: Enforce strict multiples of 4px/8px (`p-2`, `p-4`, `p-6`). No random arbitrary margins.

### D. Dieter Rams' 10 Principles Adapted to Software UI
* *"Weniger, aber besser"* (Less, but better).
* **Honest Design**: If hardware lacks battery protection threshold registers, the UI must explicitly say `"Hardware Locked • Target Fixed"` with a padlock rather than allowing an unresponsive draggable slider.
* **Unobtrusive**: The UI is a quiet frame for the user's services and media, not a noisy neon carnival.

---

## 3. Design Engineering: Micro-Interactions & Spring Physics

### A. Spring Physics vs. Fixed Duration
Traditional CSS cubic-bezier animations feel mechanical because they have fixed duration regardless of gesture speed. Spring physics model physical mass ($m$), stiffness ($k$), and damping ($c$):
* **Button Tap**: High stiffness ($k=400$), high damping ($c=28$), 0% bounce $\rightarrow$ Snappy, instant feedback.
* **Tactile LED Toggle**: Rapid state transition with subtle compression (`scale: 0.94`) and instantaneous luminous activation.
* **Modal / Drawer**: Medium stiffness ($k=200$), critical damping ($c=24$) $\rightarrow$ Smooth, organic settling without endless oscillation.

### B. GPU-Accelerated Performance
* Never animate geometry properties (`width`, `height`, `margin`, `padding`, `top`, `left`) as they cause browser layout thrashing and drop frames below 60fps.
* Only animate GPU-composited properties: `transform` (`translate3d`, `scale`, `rotate`) and `opacity`.

### C. Accessibility & Sensory Ergonomics
* Respect `prefers-reduced-motion: reduce` by replacing spring motion with immediate state flips or gentle crossfades.
* All interactive toggles and buttons include proper ARIA roles (`role="switch"`, `aria-checked="true"`, `aria-label`).

---

## 4. Applied Refactoring Blueprint for Tinapple Hub

1. **Service URL Sanitization (Zero Double Slashes)**:
   * Unified through `ApplianceService.getDisplayPath()` to guarantee clean paths like `/jellyfin` and `/pinchflat` rather than `/jellyfin/jellyfin/`.
2. **Tactile Light Toggles**:
   * Replaced generic checkbox pills with tactile circular LED push-switches featuring illuminated status cores.
3. **Full-Page Guides (No Multi-Sidebar Inception)**:
   * Replaced nested modal sidebars with clean, full-screen `/guides/<service>` routes matching the mental model of world-class documentation portals.
4. **Hardware-Locked Guard Rails**:
   * Hardware charge cutoff sliders detect hardware support and render a locked padlock state when the underlying ACPI/sysfs register is read-only.
