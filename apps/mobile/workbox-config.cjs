const output = process.env.OKBITE_WEB_OUTPUT ?? 'dist';
module.exports = {
  globDirectory: output,
  globPatterns: ['**/*.{html,js,css,ttf,woff,woff2,png,jpg,jpeg,svg,ico,webmanifest,wasm}'],
  globIgnores: ['sw.js', 'workbox-*.js', '**/zxingReader-*.js', 'screenshot-*.png'], // zxing caches on first use; install-prompt screenshots are not needed offline
  swDest: `${output}/sw.js`,
  navigateFallback: '/index.html',
  navigateFallbackDenylist: [/^\/functions\//, /^\/_expo\//],
  cleanupOutdatedCaches: true,
  clientsClaim: true,
  runtimeCaching: [{
    urlPattern: ({ url, sameOrigin }) => sameOrigin && /^\/_expo\/static\/js\/web\/zxingReader-[a-f0-9]+\.js$/.test(url.pathname),
    handler: 'CacheFirst', method: 'GET',
    options: { cacheName: 'okbite-zxing',
      cacheableResponse: { statuses: [200] },
      expiration: { maxEntries: 2, purgeOnQuotaError: true } },
  }, {
    urlPattern: /^https?:\/\/[^/]+\/functions\/v1\/lookup(?:\?|$)/,
    handler: 'NetworkFirst', method: 'GET',
    options: { cacheName: 'okbite-lookup',
      cacheableResponse: { statuses: [200] },
      expiration: { maxEntries: 200, maxAgeSeconds: 86400 } },
  }],
};
