/**
 * © Copyright Union Systems Inc 2026. All rights reserved.
 */




/** @type {import('next').NextConfig} */
const nextConfig = {
  // output: 'export',
  output: 'standalone', // Creates a minimal server for Docker
  basePath: '/v2',

  // Set workspace root to avoid Next.js inference warnings
  // This is needed because we're in a monorepo with lockfiles at multiple levels
  // Even though Turbopack isn't enabled, this config helps Next.js correctly identify
  // the workspace root for dependency resolution and module resolution
  turbopack: {
    root: process.cwd(),
  },

  // Enable source maps in production
  productionBrowserSourceMaps: true,

  pageExtensions: ['js', 'jsx', 'ts', 'tsx'], // https://nextjs.org/docs/pages/api-reference/config/next-config-js/pageExtensions

  outputFileTracingIncludes: {
    '/**/*': ['./src/app/**/*.tsx'],
  },

  // assetPrefix: isProd ? "/v2" : undefined,

  // Needed for SOC2 compliance
  // https://www.iothreat.com/blog/server-leaks-information-via-x-powered-by-http-response-header-field-s
  poweredByHeader: false,

  devIndicators: process.env.NODE_ENV === 'development' ? { position: 'bottom-right' } : false,

  async headers() {
    return [
      {
        // Disable caching for Monaco editor assets.
        // Monaco's worker initialization is sensitive to how cached assets are served.
        // Cached assets can load in different timing/order, causing race conditions
        // that lead to initialization hangs. Disabling cache ensures consistent,
        // predictable loading behavior.
        source: '/v2/monaco/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0',
          },
          {
            key: 'Pragma',
            value: 'no-cache',
          },
          {
            key: 'Expires',
            value: '0',
          },
        ],
      },
    ]
  },


}

export default nextConfig
