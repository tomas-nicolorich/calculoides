---
version: alpha
name: Calculoides Modern
description: A sleek, colorful, and subtle design system for a household budget management app.
colors:
  primary: "#3B82F6"
  primary-light: "#60A5FA"
  primary-dark: "#1E40AF"
  secondary: "#10B981"
  secondary-light: "#34D399"
  secondary-dark: "#065F46"
  tertiary: "#F59E0B"
  neutral-50: "#F8FAFC"
  neutral-100: "#F1F5F9"
  neutral-200: "#E2E8F0"
  neutral-300: "#CBD5E1"
  neutral-400: "#94A3B8"
  neutral-500: "#64748B"
  neutral-600: "#475569"
  neutral-700: "#334155"
  neutral-800: "#1E293B"
  neutral-900: "#0F172A"
  surface: "#FFFFFF"
  surface-dark: "#1E293B"
  error: "#EF4444"
  success: "#10B981"
  warning: "#F59E0B"
  info: "#3B82F6"
typography:
  headline-display:
    fontFamily: Outfit
    fontSize: 48px
    fontWeight: 700
    lineHeight: 1.1
    letterSpacing: -0.02em
  headline-lg:
    fontFamily: Outfit
    fontSize: 32px
    fontWeight: 600
    lineHeight: 1.2
    letterSpacing: -0.01em
  headline-md:
    fontFamily: Outfit
    fontSize: 24px
    fontWeight: 600
    lineHeight: 1.3
  body-lg:
    fontFamily: Plus Jakarta Sans
    fontSize: 18px
    fontWeight: 400
    lineHeight: 1.6
  body-md:
    fontFamily: Plus Jakarta Sans
    fontSize: 16px
    fontWeight: 400
    lineHeight: 1.6
  body-sm:
    fontFamily: Plus Jakarta Sans
    fontSize: 14px
    fontWeight: 400
    lineHeight: 1.5
  label-lg:
    fontFamily: Plus Jakarta Sans
    fontSize: 14px
    fontWeight: 600
    lineHeight: 1.2
    letterSpacing: 0.05em
  label-md:
    fontFamily: Plus Jakarta Sans
    fontSize: 12px
    fontWeight: 600
    lineHeight: 1.2
    letterSpacing: 0.05em
rounded:
  sm: 8px
  md: 16px
  lg: 24px
  xl: 32px
  full: 9999px
spacing:
  xs: 4px
  sm: 8px
  md: 16px
  lg: 24px
  xl: 32px
  "2xl": 48px
  "3xl": 64px
components:
  card:
    backgroundColor: "{colors.surface}"
    rounded: "{rounded.lg}"
    padding: "{spacing.lg}"
  button-primary:
    backgroundColor: "{colors.primary}"
    textColor: "#FFFFFF"
    rounded: "{rounded.md}"
    padding: 12px 24px
  button-secondary:
    backgroundColor: "{colors.neutral-100}"
    textColor: "{colors.neutral-900}"
    rounded: "{rounded.md}"
    padding: 12px 24px
---

# Calculoides Modern Design System

## Overview

Calculoides Modern is a design system focused on clarity, approachability, and financial empowerment. It balances the precision of financial data with a "sleek, colorful, and subtle" aesthetic. The goal is to make household budgeting feel less like a chore and more like a collaborative, rewarding experience.

The design leverages **Glassmorphism Lite**—subtle transparencies, soft blurs, and layered elevations—to create depth without clutter. It uses a card-based layout to organize complex information into digestible sections.

## Colors

The palette is professional yet vibrant, using soft gradients and a clean neutral foundation.

- **Primary (Blue):** Represents trust and stability. Used for primary actions and core branding.
- **Secondary (Green):** Represents growth and positive balance. Used for income and success states.
- **Tertiary (Amber):** Used for warnings and pending transfers.
- **Neutral (Slate/Gray):** Provides the structural foundation.
- **Surface (White/Dark Navy):** The canvas for all content.

## Typography

The typography pairs the geometric character of **Outfit** for headings with the high readability of **Plus Jakarta Sans** for body and data.

- **Headlines (Outfit):** Modern and approachable. High contrast in weight establishes clear hierarchy.
- **Body (Plus Jakarta Sans):** Optimized for screen readability, especially for numerical data.
- **Labels:** Uppercase labels with slight letter spacing are used for metadata and category titles to provide a distinct "data" feel.

## Layout

The system uses an **8px grid** and a **Fluid Card Layout**.

- **Containers:** Max width of 1440px for desktop, with responsive margins (16px mobile, 32px desktop).
- **Cards:** The primary unit of organization. Cards use generous internal padding (`24px`) and are separated by `24px` gaps.
- **Asymmetry:** Subtle use of asymmetrical layouts (e.g., varying card widths) prevents the dashboard from feeling like a rigid spreadsheet.

## Elevation & Depth

Depth is established through **Layered Shadows** and **Blur Overlays**.

- **Level 1 (Subtle):** Low-blur shadow for static cards.
- **Level 2 (Active):** Higher blur and slight lift for interactive elements or hovered cards.
- **Overlay:** 20% opacity white/black with 12px backdrop-filter: blur for modals and the hamburger menu.

## Shapes

Soft, large corner radii (`16px` to `24px`) are used to convey a friendly, modern feel.

- **Cards:** `24px` (lg)
- **Buttons/Inputs:** `16px` (md)
- **Chips:** `full` (pill-shaped)

## Components

### Buttons
- **Primary:** Gradient background (`primary` to `primary-light`), white text, subtle shadow.
- **Secondary:** Neutral-100 background, neutral-900 text, no shadow.
- **Icon Buttons:** Circular, with soft hover states.

### Cards
- **Dashboard Cards:** Elevated pure white surface with a very subtle 1px border (`neutral-200`).
- **Stacked Bar Charts:** Uses `primary`, `secondary`, and `tertiary` colors with rounded ends for a "pill" look.

### Hamburger Menu
- **Slide-out Sidebar:** Glassmorphism effect, full height, right-aligned.

## Do's and Don'ts

- **Do** use gradients sparingly to highlight progress or primary actions.
- **Don't** use sharp corners; every interactive element must have at least an 8px radius.
- **Do** ensure numerical data is always readable with high contrast.
- **Don't** use more than 3 distinct colors in a single card to avoid visual noise.
- **Do** use BaseUI for complex interactions (Popups, Menus, Selects) to maintain accessibility.
