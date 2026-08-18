# Theme Preference Specification

## Purpose

Manual light/dark theme selection driving `.dark` on `<html>`, persisted in
`localStorage`, with no first-paint flash under SSR (design.md ADR-7). No
`next-themes` dependency and no continuous OS-preference sync beyond the
first, unstored load.

## Requirements

### Requirement: Manual Toggle Sets `.dark` on the Document Element

`ThemeToggle` MUST add or remove the `.dark` class on `document.documentElement`
and MUST NOT depend on any router or data-fetching state.

#### Scenario: Toggling to dark mode
- GIVEN the document has no `.dark` class
- WHEN the user activates the theme toggle
- THEN `.dark` is added to `<html>` and dark-mode tokens (`app/globals.css`'s `@custom-variant dark`) apply immediately

#### Scenario: Toggling back to light mode
- GIVEN `<html>` has the `.dark` class
- WHEN the user activates the toggle again
- THEN `.dark` is removed and light-mode tokens apply

### Requirement: A Blocking Inline Script Prevents a Flash of Wrong Theme

`app/layout.tsx` MUST inject a blocking inline `<script>` in `<head>`,
before `<body>`, that reads the stored preference and sets `.dark` on
`<html>` before first paint. `<html>` MUST carry `suppressHydrationWarning`
so React does not flag the script-applied class as a hydration mismatch
(ADR-7).

#### Scenario: Dark-preference user reloads with no visible flash
- GIVEN a user previously chose dark mode and reloads the page
- WHEN the HTML streams to the browser
- THEN `.dark` is present on `<html>` before the first paint, with no light-mode frame visible first

#### Scenario: Root layout stays statically renderable
- GIVEN theme resolution happens via the inline script, not a `cookies()` read
- WHEN `app/layout.tsx` is built
- THEN it is not forced into dynamic rendering by theme logic (unlike a cookie-based approach, which would deopt `/login`, `/signup`, etc.)

### Requirement: Preference Persists in `localStorage` Under the Pre-Migration Key

The chosen theme MUST persist across reloads and sessions in `localStorage`,
under the same key the pre-migration Vite implementation used, so an
existing user's stored preference survives the migration unchanged.

#### Scenario: Preference survives a reload
- GIVEN a user toggles to dark mode
- WHEN they reload the page
- THEN the theme reads back from `localStorage` and `.dark` is reapplied before paint

#### Scenario: Pre-migration stored value is honored
- GIVEN a `localStorage` entry was written by the pre-migration Vite app under its theme key
- WHEN the ported app loads
- THEN it reads and honors that same key/value rather than treating the user as having no stored preference

### Requirement: First Load Without a Stored Preference Falls Back Once, Without Ongoing OS Sync

When no stored preference exists, the system MUST fall back to a sensible
default on first load only. It MUST NOT continuously track OS
`prefers-color-scheme` changes after that first load — only the manual
toggle changes the theme thereafter.

#### Scenario: First-ever visit with no stored preference
- GIVEN `localStorage` has no theme entry
- WHEN the page loads
- THEN a default theme applies and, once the user interacts with the toggle, that choice is written to `localStorage`

#### Scenario: OS preference changes after a manual choice is already stored
- GIVEN a user has already toggled and a value exists in `localStorage`
- WHEN the OS-level color scheme changes afterward
- THEN the app's applied theme does not change — the stored manual choice keeps controlling `.dark`
