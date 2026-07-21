/*
 * Authentication boundary
 *
 * This static beta deliberately has no login flow. When access control is
 * enabled, replace this adapter with a Cloudflare Access or Supabase adapter.
 * Application code must consume an access context, never provider SDKs.
 */
(() => {
  const configuration = Object.freeze({
    provider: 'unconfigured',
    enforced: false,
    supportedProviders: Object.freeze(['cloudflare-access', 'supabase-auth'])
  });

  const getAccessContext = async () => Object.freeze({ status: 'not-configured' });

  window.WriDNAAuth = Object.freeze({ configuration, getAccessContext });
})();
