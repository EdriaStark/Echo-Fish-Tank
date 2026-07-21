# WriDNA Design System

`design-system.js` exposes a small, dependency-free component layer on `window.WritingDNAComponents`.

## Shared tokens

- Spacing follows the existing 8px-based rhythm.
- `--radius` controls every component corner radius.
- `--card-shadow` is the single card elevation token.
- Typography inherits the product scale already defined in `styles.css`.
- Motion uses the same `cubic-bezier(.16, 1, .3, 1)` curve and respects reduced-motion preferences.

## Components

- `PrimaryButton({ id, label, className, disabled, attributes })`
- `SecondaryButton({ id, label, className, disabled, attributes })`
- `Card({ className, content, attributes })`
- `Section({ id, className, label, content })`
- `UploadArea()`
- `StatsCard()`
- `ProgressCard()`
- `Metric({ label, value, description, className })`
- `Header()`
- `Footer()`

The app mounts `Header`, `Footer`, `UploadArea`, `ProgressCard`, and `StatsCard` directly from the system. The analysis dashboard reuses `Card` and `Metric` for its result cards.
