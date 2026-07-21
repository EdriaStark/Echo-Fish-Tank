# Deployment

## Cloudflare Pages

WriDNA is a static application. It does not require a server, API endpoint, or runtime secret.

1. Create a Cloudflare Pages project from the repository.
2. Use `npm run build` as the build command.
3. Set the build output directory to `.`.
4. Set the production branch to the branch you release from.
5. Attach a custom domain after the first successful deployment.

`wrangler.toml` records the same output directory for Wrangler-based deployments. `_redirects` sends unknown routes to `index.html`, so future client-side routes work on both preview and production domains. `_headers` adds browser security headers while allowing the on-demand ZIP parser from jsDelivr.

## Verification

Run `npm run build` before deployment. The static verifier confirms that required assets exist, the auth boundary is loaded, SPA fallback is present, and no deployment-specific canonical URL is embedded.
