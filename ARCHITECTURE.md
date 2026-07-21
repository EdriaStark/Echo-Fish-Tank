# Architecture

## Current product boundary

WriDNA is a dependency-light static application. It is intentionally local-first during the private beta.

```text
index.html
  -> design-system.js    shared HTML component factories
  -> auth-boundary.js    future access-provider seam
  -> app.js              interaction, analysis, persistence, exports
styles.css               semantic tokens and responsive presentation
demo-data.js             lazy-loaded sample corpus
```

## Data flow

1. A user imports Markdown, text, or a ZIP.
2. `app.js` parses content locally and saves the workspace to IndexedDB.
3. Local statistics generate the report and AI-ready prompt.
4. Export actions create a client-side download.

No article content is sent to a WriDNA backend in this version.

## Future authentication

`auth-boundary.js` is the only intended integration point for access providers. It exposes a provider-neutral access context and contains no credentials, login form, or authorization bypass.

For Cloudflare Access, enforce access at the Cloudflare edge before static assets are served. For Supabase Auth, replace the boundary adapter and have the application request only its normalized access context. Do not import provider SDKs directly into `app.js`.

## Future cloud sync

Cloud sync must be a separate, explicit opt-in layer. It should encrypt data in transit, disclose the storage region and retention policy, and preserve the current export and deletion controls. Local IndexedDB remains the default workspace until the user enables sync.

## Build process

There is no bundler. `npm run build` runs a deterministic static verification script. Cloudflare Pages serves the repository root, `_headers` defines browser protections, and `_redirects` provides SPA fallback.
