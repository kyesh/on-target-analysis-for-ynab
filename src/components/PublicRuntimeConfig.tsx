'use client';

import React from 'react';

/**
 * Injects selected public runtime configuration into window.__PUBLIC_CONFIG__.
 * Reads from process.env on the server and first client render.
 */
export function PublicRuntimeConfig() {
  const cfg = {
    YNAB_CLIENT_ID: process.env.NEXT_PUBLIC_YNAB_CLIENT_ID || '',
    APP_URL: process.env.NEXT_PUBLIC_APP_URL || '',
  } as const;

  const script = `window.__PUBLIC_CONFIG__ = Object.assign({}, window.__PUBLIC_CONFIG__, ${JSON.stringify(
    cfg
  )});`;

  return <script dangerouslySetInnerHTML={{ __html: script }} />;
}

