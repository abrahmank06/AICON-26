---
version: 1
slug: "src-app-tsx"
primary_target: "src/App.tsx"
related_targets: ["src/features"]
---

# YIELD dashboard (all six views)

Mode: Operate. Audience: AICON'26 judges watching a live demo; framed for mandi procurement buyers. Task: know in 5 seconds whether a price spike is coming for the chosen market + crop, then see the evidence on demand. Constraints: light theme, not info-dumped, spec colour semantics (red spike, amber elevated, green/blue stable), mock data labelled synthetic.

## Direction contract

THESIS: Every view gives one verdict, stamped like a grade mark on a mandi sack; the evidence sits underneath on tags. Refuses the category default of a wall of equal KPI tiles.

OWN-WORLD: Unbleached jute ground (pale warm khaki, not cream), white tag-card surfaces with a punched-eyelet corner, stencil-ink indigo as the shell/action ink, risk inks red/amber/green as stamp colours only. Big Shoulders Stencil for verdicts and headline prices; Archivo for all UI and tabular figures.

STORY: The viewer sees the stamp ("SPIKE LIKELY" / "WATCH" / "STABLE"), the price and its 7-day direction, then opens forecast, time machine or proof if they want more.

FIRST VIEWPORT: Top bar: YIELD wordmark, six tabs, filters (date, market, crop) on the right. Body: one large tag card, left the stamp verdict and plain sentence, right current price in stencil at display scale; below, three quiet supporting readings with explanations behind info toggles.

FORM: Mandi sack stencil, position 3 of 7 on the grounded list; raised by Airport wayfinding (one message per band, only the next decision), Star atlas (risk on a fixed magnitude ramp), Saville catalog (nothing labeled twice). Seed key 7922bdf6.

FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance

Signature interaction: on filter change the verdict stamp re-presses (scale down + ink-in, spring damping 1.0), never a spinner on the verdict itself.
