---
name: Maahir
description: Early warning for vegetable price spikes in Punjab's wholesale markets.
colors:
  field: "#f1f5ed"
  field-deep: "#e4ecdf"
  field-line: "#cad8c4"
  card: "#fffefa"
  ink: "#182744"
  ink-2: "#52605b"
  ink-3: "#758078"
  line: "#dfe7db"
  navy: "#182744"
  navy-2: "#29466b"
  navy-soft: "#e1e8ef"
  gold: "#c2964a"
  sun-wash: "rgb(194 150 74 / 0.16)"
  leaf-wash: "rgb(76 121 77 / 0.14)"
  field-1: "#dbe7d0"
  field-2: "#cddfbf"
  field-3: "#e8dcbd"
  furrow: "#9fbb8a"
  node-muted: "#9aa595"
  spike: "#b3261e"
  spike-soft: "#f7e1dd"
  watch: "#94570a"
  watch-ink: "#b86e00"
  watch-soft: "#f6e8cc"
  stable: "#2d6a45"
  stable-soft: "#dcebdf"
  soil: "#8c7a52"
typography:
  display:
    fontFamily: "Sora Variable, ui-sans-serif, system-ui, sans-serif"
    fontSize: "clamp(2.8rem, 5.5vw, 4rem)"
    fontWeight: 600
    lineHeight: 1
    letterSpacing: "-0.035em"
  status:
    fontFamily: "Sora Variable, ui-sans-serif, system-ui, sans-serif"
    fontSize: "clamp(1.35rem, 3vw, 1.8rem)"
    fontWeight: 600
    lineHeight: 1.2
    letterSpacing: "-0.02em"
  headline:
    fontFamily: "Sora Variable, ui-sans-serif, system-ui, sans-serif"
    fontSize: "clamp(1.6rem, 3vw, 2.3rem)"
    fontWeight: 600
    lineHeight: 1.15
    letterSpacing: "-0.015em"
  title:
    fontFamily: "Sora Variable, ui-sans-serif, system-ui, sans-serif"
    fontSize: "clamp(1.2rem, 2vw, 1.5rem)"
    fontWeight: 600
    lineHeight: 1.25
  reading:
    fontFamily: "Sora Variable, ui-sans-serif, system-ui, sans-serif"
    fontSize: "1.75rem"
    fontWeight: 650
    lineHeight: 1
    letterSpacing: "-0.035em"
    fontFeature: "'tnum' 1"
  panel-title:
    fontFamily: "Sora Variable, ui-sans-serif, system-ui, sans-serif"
    fontSize: "18px"
    fontWeight: 600
    lineHeight: 1.3
  lead:
    fontFamily: "Sora Variable, ui-sans-serif, system-ui, sans-serif"
    fontSize: "16px"
    fontWeight: 400
    lineHeight: 1.6
  body:
    fontFamily: "Sora Variable, ui-sans-serif, system-ui, sans-serif"
    fontSize: "15px"
    fontWeight: 400
    lineHeight: 1.5
  label:
    fontFamily: "Sora Variable, ui-sans-serif, system-ui, sans-serif"
    fontSize: "13.5px"
    fontWeight: 500
    lineHeight: 1.4
  caption:
    fontFamily: "Sora Variable, ui-sans-serif, system-ui, sans-serif"
    fontSize: "12.5px"
    fontWeight: 500
    lineHeight: 1.4
  chip:
    fontFamily: "Sora Variable, ui-sans-serif, system-ui, sans-serif"
    fontSize: "12px"
    fontWeight: 600
    lineHeight: 1.3
rounded:
  focus: "6px"
  control: "10px"
  segment: "12px"
  panel: "14px"
  card: "20px"
  pill: "999px"
spacing:
  page-x: "32px"
  card-x: "40px"
  card-top: "56px"
  section: "40px"
  group: "24px"
components:
  button-primary:
    backgroundColor: "{colors.navy}"
    textColor: "{colors.card}"
    rounded: "{rounded.control}"
    height: "40px"
    padding: "0 16px"
  button-primary-hover:
    backgroundColor: "{colors.navy-2}"
  button-quiet:
    textColor: "{colors.navy}"
    rounded: "{rounded.control}"
    height: "40px"
  button-quiet-hover:
    backgroundColor: "{colors.navy-soft}"
  field:
    backgroundColor: "{colors.card}"
    textColor: "{colors.ink}"
    rounded: "{rounded.control}"
    height: "40px"
  card:
    backgroundColor: "{colors.card}"
    rounded: "{rounded.card}"
  badge-correct:
    backgroundColor: "{colors.stable-soft}"
    textColor: "{colors.stable}"
    rounded: "{rounded.pill}"
  badge-false-alarm:
    backgroundColor: "{colors.watch-soft}"
    textColor: "{colors.watch}"
    rounded: "{rounded.pill}"
---

# Design System: Maahir

## Overview

**Creative North Star: "Morning Over The Fields"**

Maahir is a calm, light forecasting dashboard. The palette comes from the Maahir logo (deep navy and wheat gold) laid over a pale leaf-green ground. A soft farmland horizon (rolling fields, crop furrows, a low sun) sits fixed at the bottom of the viewport, so short views never feel empty. Content sits on warm white cards.

Density is deliberately low (a user-pinned constraint: light, not info-dumped). Each view leads with one sentence-long answer and at most three or four supporting readings. Jargon such as MAPE, SHAP or panic index is explained in a hover tooltip, never inline.

**Key Characteristics:**
- Pale leaf ground with sun and leaf radial washes, plus the field horizon. Colour on content is spent on meaning only.
- One family, Sora, for everything. Big numbers are Sora semibold with tight tracking, never decorative.
- One status badge per view (Stable, Watch, Spike likely), a soft pill in its risk colour.
- Plain-language headings that state the conclusion ("No spike expected for Lahore onions.").

## Colors

### Brand
- **Maahir Navy** (#182744): logo, ink, active tab, primary buttons, actual-price line, selected nodes.
- **Navy 2** (#29466b): forecast line, hover state of primary actions, negative SHAP bars.
- **Wheat Gold** (#c2964a): logo and the backdrop sun only. Never used for risk.

### Risk inks (reserved)
- **Spike Red** (#b3261e): spike alert band, "Spike likely" badge, ramp levels 4–5, positive SHAP bars.
- **Watch Amber** (#b86e00 ink, #94570a text): "Watch" badge, ramp level 3, false-alarm badge, demo-data chip.
- **Stable Green** (#2d6a45): "Stable" and "Called it" badges, correct-alert badge, verdict-card accent.

### Neutral and ground
- **Field** (#f1f5ed): page ground and sticky header (85% with blur).
- **Field Deep / Field Line** (#e4ecdf / #cad8c4): skeletons, empty ramp steps, segmented track, borders.
- **Card** (#fffefa): every surface that holds content.
- **Ink 2 / Ink 3** (#52605b / #758078): secondary text; Ink 3 only for icons and non-essential marks.
- **Backdrop** (#dbe7d0, #cddfbf, #e8dcbd fields; #9fbb8a furrows): `FieldBackdrop` only.
- **Soil** (#8c7a52): the negative end of the spillover heatmap's diverging scale.

### Named Rules
**The Ink Means Risk Rule.** Red, amber and green never decorate content. Each one always pairs with a word (badge, banner) so colour is never the only carrier.

**The One Wash Rule.** Only one region per view may be filled with navy: the Performance business-impact panel.

## Typography

**Font:** Sora Variable (self-hosted via @fontsource), used for everything, with tabular figures in every number.

### Hierarchy
- **Display** (600, clamp(2.8rem, 5.5vw, 4rem), −0.035em): headline numbers only, such as today's price, MAPE and savings.
- **Status** (600, clamp(1.35rem, 3vw, 1.8rem)): the verdict badge.
- **Headline** (600, clamp(1.6rem, 3vw, 2.3rem)): the one-sentence answer per view.
- **Title** (600, clamp(1.2rem, 2vw, 1.5rem)): panel conclusions.
- **Reading** (650, 1.75rem, tnum): supporting metric values.
- **Panel title** (600, 18px), **Lead** (16px), **Body** (15px), **Label** (13–13.5px), **Caption** (12.5px), **Chip** (12px).

## Layout

Single centred column, max 1180px, 20px side padding on mobile and 32px from 640px up. Each view stacks: (optional banner) → verdict card → supporting readings or the main panel. Readings sit on the ground in a 3- or 4-column row separated by hairlines, collapsing on mobile. The header puts the logo and filters in a row from 1024px. The tab list scrolls horizontally with a fade mask under 1024px.

## Elevation & Depth

- **Card** (`0 1px 2px rgb(60 50 20 / .06), 0 8px 24px -12px rgb(60 50 20 / .18)` + 1px ring): every card.
- **Card hover** (`0 2px 4px rgb(24 39 68 / .06), 0 18px 36px -16px rgb(24 39 68 / .24)`): every card on hover, with a 3px lift (`.card-hover`, ease-in-out-sine `cubic-bezier(0.37, 0, 0.63, 1)`: 650ms in, 800ms back out; pointer devices only).
- **Pop** (`0 2px 4px rgb(28 32 48 / .08), 0 16px 40px -16px rgb(28 32 48 / .28)`): tooltips.
- **Alert** (`0 8px 24px -12px rgb(179 38 30 / .6)`): spike alert band only.

## Components

### Status badge
`Stamp.tsx`: a rounded pill, risk colour text on a 10% tint of itself with a 28% border. Re-mounts when market, crop or date change. No rotation, filters or stencil.

### Cards
Card white, 20px radius. The single verdict card per view carries a short green accent tab at its top edge.

### Info tooltips
`InfoTip.tsx`: the "i" icon reveals its explanation on hover and on keyboard focus (CSS `group-hover` / `group-focus-within`), with `role="tooltip"` and `aria-describedby`. Hidden tooltips are `display: none` so they never cause overflow. On touch devices a tap focuses the button, which shows it.

### Readings, buttons, inputs, navigation, charts
Unchanged in structure: five-step magnitude ramp, navy primary buttons with 0.97 press, native fields with custom chevron, spring-sliding tab underline, Plotly time series with dashed forecast, 80% band and hollow imputed markers.

## Do's and Don'ts

### Do:
- **Do** open every view with one plain-language conclusion, then the badge or the main visual.
- **Do** keep supporting metrics to three or four, each with a hover tooltip.
- **Do** use tabular figures for every number and PKR for every price.
- **Do** label demo or placeholder figures as such (the header's Demo data chip).

### Don't:
- **Don't** use red, amber or green for anything except risk and verdicts.
- **Don't** reintroduce stencil, stamp or rotated display type.
- **Don't** add a dark theme; the user pinned a light theme.
- **Don't** add decorative grid overlays; the field backdrop is the only ornament.
- **Don't** grid out equal KPI tiles or add eyebrow labels above headings.
