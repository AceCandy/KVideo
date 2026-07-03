---
name: KVideo
description: Immersive, clear, trustworthy video aggregation and playback UI.
colors:
  bg-light: "#f2f4f7"
  bg-dark: "#121212"
  bg-dark-deep: "#1a1a1a"
  text-light: "#1d1d1f"
  text-secondary-light: "#6e6e73"
  text-dark: "#f5f5f7"
  text-secondary-dark: "#8e8e93"
  accent-light: "#0056b3"
  accent-dark: "#1a6dbf"
  glass-light: "#fffffff2"
  glass-dark: "#1e1e1ee6"
  glass-border-light: "#0000000d"
  glass-border-dark: "#ffffff1a"
  shadow-light: "#0000000d"
  shadow-dark: "#0000004d"
  player-surface: "#1c1c1ebf"
typography:
  display:
    fontFamily: "-apple-system, BlinkMacSystemFont, Segoe UI, Roboto, Helvetica Neue, Arial, Noto Sans, Liberation Sans, sans-serif"
    fontSize: "1.5rem"
    fontWeight: 700
    lineHeight: 1.2
    letterSpacing: "0"
  headline:
    fontFamily: "-apple-system, BlinkMacSystemFont, Segoe UI, Roboto, Helvetica Neue, Arial, Noto Sans, Liberation Sans, sans-serif"
    fontSize: "1.25rem"
    fontWeight: 600
    lineHeight: 1.3
    letterSpacing: "0"
  title:
    fontFamily: "-apple-system, BlinkMacSystemFont, Segoe UI, Roboto, Helvetica Neue, Arial, Noto Sans, Liberation Sans, sans-serif"
    fontSize: "1rem"
    fontWeight: 600
    lineHeight: 1.4
    letterSpacing: "0"
  body:
    fontFamily: "-apple-system, BlinkMacSystemFont, Segoe UI, Roboto, Helvetica Neue, Arial, Noto Sans, Liberation Sans, sans-serif"
    fontSize: "1rem"
    fontWeight: 400
    lineHeight: 1.6
    letterSpacing: "0"
  label:
    fontFamily: "-apple-system, BlinkMacSystemFont, Segoe UI, Roboto, Helvetica Neue, Arial, Noto Sans, Liberation Sans, sans-serif"
    fontSize: "0.875rem"
    fontWeight: 600
    lineHeight: 1.2
    letterSpacing: "0"
rounded:
  panel: "1.5rem"
  pill: "9999px"
  compact: "0.25rem"
spacing:
  xs: "0.25rem"
  sm: "0.5rem"
  md: "1rem"
  lg: "1.5rem"
  xl: "2rem"
  touch-min: "44px"
components:
  button-primary:
    backgroundColor: "{colors.accent-light}"
    textColor: "#ffffff"
    rounded: "{rounded.panel}"
    padding: "0.75rem 1.25rem"
  button-secondary:
    backgroundColor: "{colors.glass-light}"
    textColor: "{colors.text-light}"
    rounded: "{rounded.panel}"
    padding: "0.75rem 1.25rem"
  input-default:
    backgroundColor: "{colors.glass-light}"
    textColor: "{colors.text-light}"
    rounded: "{rounded.panel}"
    padding: "0.75rem 1rem"
  card-default:
    backgroundColor: "{colors.glass-light}"
    textColor: "{colors.text-light}"
    rounded: "{rounded.panel}"
    padding: "1rem"
  badge-primary:
    backgroundColor: "{colors.accent-light}"
    textColor: "#ffffff"
    rounded: "{rounded.pill}"
    padding: "0.125rem 0.375rem"
---

# Design System: KVideo

## 1. Overview

**Creative North Star: "The Clear Glass Theater"**

KVideo is a task-first video interface with a restrained Liquid Glass layer system. The experience should feel immersive enough for playback, clear enough for source comparison, and trustworthy enough for self-hosted configuration. The visual language starts with cool neutral surfaces, one blue primary accent, glass panels, pill controls, and dense but legible content grids.

The system rejects generic streaming-service spectacle. Posters and video should carry the cinematic energy; the interface stays quiet, legible, and predictable. Glass effects are allowed only when they separate navigation, panels, overlays, and controls without harming contrast or focus clarity.

The product is used across desktop, mobile, PWA, and TV/remote contexts, so the same visual vocabulary must survive different densities. Buttons, filters, playback controls, settings panels, and source badges should feel related even when their layout changes.

**Key Characteristics:**
- Cool light and dark surfaces with a single blue accent for primary actions and active state.
- Liquid Glass panels with soft borders, restrained shadows, and clear foreground text.
- System sans typography with compact hierarchy and fixed rem sizing.
- Pill-shaped badges and icon controls for scan-friendly metadata.
- Motion limited to state feedback, loading, overlays, and playback controls.

## 2. Colors

The palette is a restrained product palette: cool neutrals carry the surface, blue carries action and selection, and player overlays use dark translucent glass.

### Primary
- **Action Blue Light** (`accent-light`): Used for primary buttons, selected segments, focus rings, progress ranges, active episodes, and source badges in light mode.
- **Action Blue Dark** (`accent-dark`): Dark-mode companion for the same active and primary roles.

### Neutral
- **Cool App Light** (`bg-light`): The light-mode page background and calm base for search, settings, and lists.
- **Cinema Black** (`bg-dark`): The dark-mode base and premium/player-adjacent surface.
- **Deep Cinema Layer** (`bg-dark-deep`): The dark-mode gradient partner for depth, used only as background atmosphere.
- **Primary Ink Light** (`text-light`): Main readable text in light mode.
- **Secondary Ink Light** (`text-secondary-light`): Secondary labels and descriptions in light mode; must remain readable against glass.
- **Primary Ink Dark** (`text-dark`): Main readable text in dark mode.
- **Secondary Ink Dark** (`text-secondary-dark`): Secondary labels and descriptions in dark mode.
- **Glass Surface Light** (`glass-light`): Primary panel, nav, input, and card surface in light mode.
- **Glass Surface Dark** (`glass-dark`): Primary panel, nav, input, and card surface in dark mode.
- **Fine Glass Border Light** (`glass-border-light`): Low-contrast separators in light mode.
- **Fine Glass Border Dark** (`glass-border-dark`): Low-contrast separators in dark mode.
- **Player Control Glass** (`player-surface`): Playback controls, toast surfaces, and in-player menus.

### Named Rules

**The One Blue Rule.** Blue is for action, focus, selection, progress, and active state. It is not page decoration.

**The Glass Contrast Rule.** A glass surface must keep body text at WCAG AA contrast. If blur or translucency makes text look washed out, increase opacity or darken the text before adding more effect.

**The Poster Carries Color Rule.** Video artwork supplies most saturated color. Interface chrome stays restrained so metadata and controls remain scannable.

## 3. Typography

**Display Font:** System sans stack with Apple, Segoe UI, Roboto, Helvetica Neue, Arial, Noto Sans fallbacks.

**Body Font:** The same system sans stack.

**Label/Mono Font:** System sans for labels; latency and technical readouts may use the platform monospace through utility classes.

**Character:** Typography is functional and compact. KVideo uses weight, spacing, and placement instead of decorative fonts so search, source metadata, settings labels, and playback controls remain familiar across devices.

### Hierarchy
- **Display** (700, `1.5rem`, line-height `1.2`): App title and top-level brand mark in the nav. Keep it short and never use oversized marketing scale inside task screens.
- **Headline** (600, `1.25rem`, line-height `1.3`): Section titles, modal headers, settings group headings, and major empty-state headings.
- **Title** (600, `1rem`, line-height `1.4`): Video card titles, source group labels, player metadata headings, and compact panel headings.
- **Body** (400, `1rem`, line-height `1.6`): Descriptions, settings help text, empty-state guidance, and readable prose. Cap long prose at 65-75ch.
- **Label** (600, `0.875rem`, line-height `1.2`): Buttons, tabs, filters, chips, badges, field labels, and compact control labels.

### Named Rules

**The Product Scale Rule.** Use fixed rem sizing for product UI. Do not use hero-scale fluid typography for task screens, cards, settings, or playback controls.

**The No Decorative Font Rule.** Do not introduce display, serif, script, or novelty fonts into labels, controls, metadata, or player UI.

## 4. Elevation

KVideo uses a hybrid of tonal layering, glass opacity, fine borders, and restrained shadows. Resting UI should feel lightly separated, not floating. Stronger shadows are reserved for hover feedback, player overlays, drawers, menus, and modals where depth clarifies stacking.

### Shadow Vocabulary
- **Resting Hairline** (`shadow-sm`: `0 1px 2px var(--shadow-color)`): Nav shell, badges, and quiet panels.
- **Panel Lift** (`shadow-md`: `0 4px 6px var(--shadow-color)`): Settings panels, dropdowns, and stable elevated containers.
- **Interactive Hover** (`0 8px 24px var(--shadow-color)`): Cards or panels that lift on hover.
- **Player Overlay Depth** (`0 8px 32px rgba(0, 0, 0, 0.3)`): In-player controls and overlays on top of video.
- **Focus Glow** (`0 0 0 3px color-mix(in srgb, var(--accent-color) 30%, transparent)`): Inputs and controls in active focus.

### Named Rules

**The State Earns Shadow Rule.** Shadows get stronger only for state or stacking: hover, focus, modal, menu, drawer, and player overlay. Static content cards stay quiet.

**The Glass Is Not Fog Rule.** Blur and translucency must clarify hierarchy. If a panel needs more readability, increase surface opacity before increasing blur.

## 5. Components

### Buttons
- **Shape:** Soft panel corners (`1.5rem`) for text buttons; full pills (`9999px`) for icon-only controls and small badges.
- **Primary:** Blue background with white text, minimum touch height (`44px`), strong font weight, and horizontal padding from `1.25rem` to `1.5rem`.
- **Hover / Focus:** Hover may brighten and lift by `-2px`; focus must use the blue 2px outline or 3px focus glow. Active state compresses to `scale(0.98)` or returns to `translateY(0)`.
- **Secondary / Ghost:** Secondary buttons use glass surface, fine border, and foreground text. Ghost buttons stay transparent and only tint on hover.

### Chips
- **Style:** Chips use full-pill geometry, compact `10px-14px` labels, and either blue-filled primary state or glass secondary state.
- **State:** Selected filter chips use blue fill and white text. Unselected chips use glass surface, fine border, and text color; hover may tint with `color-mix(... accent 10-15%)`.
- **Metadata:** Source, type, latency, resolution, and permission markers must stay short, truncatable, and scan-friendly.

### Cards / Containers
- **Corner Style:** Soft panel corners (`1.5rem`) are the default for cards, posters, settings panels, and containers.
- **Background:** Use `glass-light` / `glass-dark` for panels, or a quieter background mix for video result cards so poster art stays dominant.
- **Shadow Strategy:** Resting cards use `shadow-sm` or `shadow-md`; hover cards may lift `-2px` and use `0 8px 24px var(--shadow-color)`.
- **Border:** One fine border using `glass-border-light` or `glass-border-dark`. Do not add colored side stripes.
- **Internal Padding:** Use `1rem` on compact cards and `1.5rem` on settings panels or larger surfaces.

### Inputs / Fields
- **Style:** Inputs use glass surface, fine border, soft panel corners, `1rem` horizontal padding, and full-width layout.
- **Focus:** Border shifts to blue and adds a 3px blue-tinted focus glow.
- **Error / Disabled:** Error uses red border and explicit text; disabled lowers opacity and keeps cursor/state clear.
- **Search:** Search fields may reserve right padding for clear/search buttons but must not let text sit underneath action controls.

### Navigation
- **Style:** The main nav is a sticky glass panel with app icon, title, optional description, and compact circular action buttons.
- **Typography:** App name uses the Display role; nav description uses secondary text and truncates at small widths.
- **States:** Icon links use glass surfaces, fine borders, and blue-tinted hover backgrounds. Each icon button requires an accessible name.
- **Mobile Treatment:** Hide nonessential nav text/actions first; keep search, settings, favorites, theme, and mode actions reachable.

### Segmented Controls
- **Shape:** A glass track with soft panel corners and an inset sliding indicator.
- **Active State:** Active segment uses blue fill and white text.
- **Motion:** Indicator movement uses a 300ms state transition; content must remain readable while it moves.

### Switches
- **Shape:** Full-pill track (`50px x 30px`) with a white circular thumb (`26px`).
- **State:** Off state uses a translucent text-color mix; on state uses blue.
- **Interaction:** Thumb movement is state feedback only. Disabled state reduces opacity and blocks cursor/interaction.

### Player Controls
- **Surface:** Player controls use dark translucent glass (`rgba(28, 28, 30, 0.75)`) with blur, fine white border, and player overlay shadow.
- **Controls:** Icon controls are minimum `2.5rem`, white foreground, and glass hover states.
- **Progress:** Progress ranges use blue. Buffers and tracks use translucent white to stay visible over video.
- **Loading:** Spinners use blue top border and should not be the only loading expression when content skeletons are possible outside the player.

## 6. Do's and Don'ts

### Do:
- **Do** use blue only for action, focus, selection, progress, and active state.
- **Do** preserve Liquid Glass as a hierarchy system: glass panels, fine borders, and soft shadows must make navigation, panels, overlays, and controls easier to parse.
- **Do** keep text contrast at WCAG AA, especially secondary text over glass and dark player overlays.
- **Do** maintain at least `44px` touch targets for buttons and core controls.
- **Do** keep source, type, latency, resolution, sync, permission, and proxy status explicit and scannable.
- **Do** design mobile, desktop, PWA, and TV/remote variants with the same action vocabulary and state semantics.

### Don't:
- **Don't** make KVideo look like a generic streaming-service homepage clone with large marketing posters, emotional hero copy, or recommendation spectacle that hides search and playback.
- **Don't** use glassmorphism as default decoration. Blur, transparency, and shadow are forbidden when they reduce contrast, target clarity, or state recognition.
- **Don't** use noisy dark entertainment styling: high-saturation neon, complex gradients, or exaggerated motion weaken trust.
- **Don't** invent non-standard playback or settings controls for flavor. Playback, volume, fullscreen, PiP, filtering, switches, and segmented controls must stay familiar.
- **Don't** weaken the legal-source responsibility. Deployment and source-setting UI should continue to communicate that users configure authorized, legally usable sources.
- **Don't** use colored side-stripe borders, gradient text, nested cards, or oversized rounded cards beyond the established `1.5rem` panel radius.
