// Cross-platform fetch. In the Tauri desktop build we use the plugin-http
// fetch (native, bypasses CORS). In the browser/PWA we use the standard
// fetch — the Anthropic calls set `anthropic-dangerous-direct-browser-access`,
// so they're allowed cross-origin.
function isTauri(): boolean {
  return typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window;
}

export async function httpFetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
  if (isTauri()) {
    const { fetch: tauriFetch } = await import('@tauri-apps/plugin-http');
    return tauriFetch(input as string, init as any);
  }
  return globalThis.fetch(input, init);
}
