/** @type {import('next').NextConfig} */
// Analytics hosts are configurable: set NEXT_PUBLIC_UMAMI_SCRIPT_URL (origin is
// added to script-src/connect-src automatically) and CSP_CF_INSIGHTS=true if
// you use Cloudflare's RUM beacon. Nothing is hardcoded here.

const umamiOrigin = (() => {
  try {
    return process.env.NEXT_PUBLIC_UMAMI_SCRIPT_URL
      ? new URL(process.env.NEXT_PUBLIC_UMAMI_SCRIPT_URL).origin
      : null;
  } catch {
    return null;
  }
})();
const allowCfInsights = process.env.CSP_CF_INSIGHTS !== "false";
const scriptExtras = [
  ...(umamiOrigin ? [umamiOrigin] : []),
  ...(allowCfInsights ? ["https://static.cloudflareinsights.com"] : []),
].join(" ");
const connectExtras = [
  ...(umamiOrigin ? [umamiOrigin] : []),
  ...(allowCfInsights ? ["https://cloudflareinsights.com"] : []),
].join(" ");

const securityHeaders = [
  // Prevent the page from being embedded in iframes (clickjacking)
  { key: "X-Frame-Options", value: "DENY" },
  // Prevent MIME-type sniffing
  { key: "X-Content-Type-Options", value: "nosniff" },
  // X-XSS-Protection is deprecated and can introduce vulnerabilities in older browsers.
  // Modern CSP provides superior protection.
  // { key: "X-XSS-Protection", value: "1; mode=block" },
  // Restrict Referer header to origin only on cross-origin requests
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  // Lock down browser features not used by this app
  {
    key: "Permissions-Policy",
    value: "geolocation=(self), camera=(), microphone=(), payment=(), usb=()",
  },
  // Force HTTPS for 1 year (only active once served over HTTPS)
  {
    key: "Strict-Transport-Security",
    value: "max-age=31536000; includeSubDomains; preload",
  },
  // Content Security Policy — primary XSS defense
  {
    key: "Content-Security-Policy",
    value: [
      "default-src 'self'",
      // NOTE: 'unsafe-inline' and 'unsafe-eval' are required for Next.js 16 runtime
      // (styled-jsx, fast refresh, etc.). Removing them will break the app.
      // For a stricter policy, implement CSP nonces via middleware.
      // Third-party beacons (self-hosted analytics, Cloudflare RUM) are added
      // from environment variables above, when configured.
      `script-src 'self' 'unsafe-inline' 'unsafe-eval'${scriptExtras ? " " + scriptExtras : ""}`,
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data: https://theunitedstates.io https://bioguide.congress.gov https://www.congress.gov https://congress.gov https://*.oyez.org",
      `connect-src 'self' https://api.bigdatacloud.net https://ipapi.co https://api.usaspending.gov${connectExtras ? " " + connectExtras : ""}`,
      "font-src 'self'",
      "frame-ancestors 'none'",
      "base-uri 'self'",
      "form-action 'self'",
    ].join("; "),
  },
];

const nextConfig = {
  output: "standalone",
  productionBrowserSourceMaps: false,
  // Do not advertise the framework via X-Powered-By (finding H-3).
  poweredByHeader: false,
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: securityHeaders,
      },
    ];
  },
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "theunitedstates.io",
      },
      {
        protocol: "https",
        hostname: "bioguide.congress.gov",
      },
      // Member photos served from congress.gov (finding F-2).
      {
        protocol: "https",
        hostname: "www.congress.gov",
      },
      {
        protocol: "https",
        hostname: "congress.gov",
      },
      {
        protocol: "https",
        hostname: "*.oyez.org",
      },
      {
        protocol: "https",
        hostname: "oyez.org",
      },
    ],
  },
};

export default nextConfig;
