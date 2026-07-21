# Sprint 4 Repository Audit

Date: 2026-07-21

## P0

### Repository scope is mixed

`socialpeta-clean/` is a separate application inside this repository. It is outside WriDNA's product boundary and should be moved to another repository before a public launch. This sprint does not move or delete it because that would change public repository scope and history.

## P1

### Deployment was GitHub Pages-specific

The page previously contained a GitHub Pages canonical URL and no SPA fallback. This sprint replaces the canonical with a root-relative value and adds Cloudflare Pages configuration, redirects, and headers.

### Private-beta access is visual only

The interface now communicates invite-only availability. It is not access control. Enforce access at the Cloudflare edge or through the documented future auth adapter before sharing non-public production data.

### Browser persistence needs user backup

IndexedDB is local and can be cleared. Workspace backup and restore now mitigate this risk. Cloud sync remains out of scope.

## P2

### Legacy presentation rules remain

`styles.css` contains earlier, now-unused onboarding and how-section rules. They do not ship extra network assets, but should be consolidated before a framework migration.

### No browser automation baseline

The repository has a deterministic static verification script but no Playwright or Lighthouse CI. Add both once a Node toolchain is standardized.

## Scan results

- GitHub Pages URLs: removed from application runtime and product documentation.
- API keys: none found in WriDNA root files.
- Unnecessary binary assets: none found in WriDNA root files.
- TODO comments: none found in WriDNA root files.
- Console logging: expected browser errors no longer log to the console in `app.js`; the build verifier emits one success line intentionally.
