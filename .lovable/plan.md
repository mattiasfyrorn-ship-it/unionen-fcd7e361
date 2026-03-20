

# Fix: Solid header background on iPhone PWA

## Problem
The mobile header uses `bg-background` which is solid in browsers but on iPhone PWA with `backdrop-blur` or translucency effects, the content scrolls visibly behind the header. The issue is that `bg-background` uses an HSL value that may render with some transparency on iOS Safari standalone mode.

## Fix

In `src/components/AppLayout.tsx`, line 36 — the mobile header:

**Current:** `bg-background sticky top-0 z-50`

**Change to:** `bg-[hsl(37,25%,92%)] sticky top-0 z-50` — use a hardcoded opaque color instead of the CSS variable, ensuring full opacity on iOS PWA.

This is a single-line change. The hardcoded value matches the `--background` token (`37 25% 92%`) but guarantees the browser treats it as fully opaque rather than potentially applying any compositing effects.

