const output = process.env.OKBITE_WEB_OUTPUT ?? 'dist';
module.exports = {
  globDirectory: output,
  globPatterns: ['**/*.{html,js,css,ttf,woff,woff2,png,jpg,jpeg,svg,ico,webmanifest}'],
  globIgnores: ['sw.js', 'workbox-*.js'],
  swDest: `${output}/sw.js`,
  navigateFallback: '/index.html',
  navigateFallbackDenylist: [/^\/functions\//, /^\/_expo\//],
  cleanupOutdatedCaches: true,
  clientsClaim: true,
  runtimeCaching: [{
    urlPattern: /^https?:\/\/[^/]+\/functions\/v1\/lookup(?:\?|$)/,
    handler: 'NetworkFirst', method: 'GET',
    options: { cacheName: 'okbite-lookup',
      cacheableResponse: { statuses: [200] },
      expiration: { maxEntries: 200, maxAgeSeconds: 86400 } },
  }],
};
