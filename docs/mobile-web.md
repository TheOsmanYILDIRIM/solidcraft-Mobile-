# Mobile web entry point in this SolidCraft fork

This fork ships an experimental touch-oriented host at **/mobile/** on its GitHub Pages site.

The page embeds this fork's **/app-edge/** SolidCraft Rust/WebAssembly build in a same-origin iframe and calls the native browser command API. It does not reimplement the B-rep kernel, parametric history or exact geometry operations.

The host has a searchable live command catalog, favorites, Model/Sketch/Inspect shortcuts, read-only history and object lists, file import/export for JSON, dark/light appearance, Turkish/English shell labels and a 50–250% UI scale setting.

**Data safety:** The iframe intentionally loads the regular **/app-edge/** app, not the stateless ?embed=editor mode, so SolidCraft's own browser storage and recovery behavior remain available. Original native controls are still visible inside the iframe. To avoid confusion, use the "Original SolidCraft interface" command when working in the native editor. The mobile interface is a first integration step, **not** a complete viewport-only UI.

## Deployment

The existing Pages workflow builds the Rust/WASM app and docs. It now also copies the two mobile assets into site/mobile/.

Upstream's web-channel packaging requires an existing stable Release. On a fresh fork with **no** releases, the Pages workflow publishes the newly built app as both /app/ and /app-edge/, leaving /app-rc/ as an informational page. When a stable release exists, the original channel packaging remains unchanged.

If Pages is enabled as GitHub Actions in the repository settings, a push to main starts the deployment.

## Testing

- Static checks: mobile/package.json in the mobile shell validation workflow.
- Full engine check: upstream cargo xtask web-api-test --site dist/web.
- Pending: WASM build and live Pages delivery, touch selection/orbit/pan conflict, Sketch->Extrude->Fillet end-to-end, .sc persistence, browser import/export parity, actual Android device verification.
- Do not interpret a green static check as model/geometry/gesture verification.

This document describes a fork-only mobile enhancement, not an upstream SolidCraft feature or a merged change to upstream.
