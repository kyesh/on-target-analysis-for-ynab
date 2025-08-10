import React from 'react';
import Script from 'next/script';

/**
 * Server component: injects selected public runtime configuration into window.__PUBLIC_CONFIG__.
 * Values are read from process.env on the server at runtime (Cloud Run env/Secret Manager).
 */
export function PublicRuntimeConfig() {
  const cfg = {
    YNAB_CLIENT_ID: process.env.NEXT_PUBLIC_YNAB_CLIENT_ID || '',
    APP_URL: process.env.NEXT_PUBLIC_APP_URL || '',
  } as const;

  const script = `window.__PUBLIC_CONFIG__ = Object.assign({}, window.__PUBLIC_CONFIG__, ${JSON.stringify(cfg)});`;

  return <Script id="public-runtime-config" strategy="beforeInteractive" dangerouslySetInnerHTML={{ __html: script }} />;
}

