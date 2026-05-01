import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  async headers() {
    const commonSecurityHeaders = [
      { key: 'Strict-Transport-Security', value: 'max-age=31536000; includeSubDomains' },
      { key: 'X-Frame-Options', value: 'DENY' },
      { key: 'X-Content-Type-Options', value: 'nosniff' },
      { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
      {
        key: 'Content-Security-Policy-Report-Only',
        value: [
          "default-src 'self'",
          "script-src 'self' 'unsafe-eval' 'unsafe-inline'",
          "style-src 'self' 'unsafe-inline'",
          "img-src 'self' blob: data:",
          "font-src 'self'",
          "connect-src 'self' https://*.supabase.co wss://*.supabase.co",
          "media-src 'self' blob:",
          "worker-src 'self' blob:",
        ].join('; '),
      },
    ];
    return [
      {
        source: '/((?!events).*)',
        headers: [
          ...commonSecurityHeaders,
          { key: 'Permissions-Policy', value: 'camera=(), microphone=()' },
        ],
      },
      {
        // Demo pages (lip-sync, avatar, etc.) need microphone for audio input.
        source: '/demo/:path*',
        headers: [
          ...commonSecurityHeaders,
          { key: 'Permissions-Policy', value: 'camera=(), microphone=(self)' },
        ],
      },
      {
        // Local WebRTC smoke-test page needs microphone access.
        source: '/test-webrtc',
        headers: [
          ...commonSecurityHeaders,
          { key: 'Permissions-Policy', value: 'camera=(), microphone=(self)' },
        ],
      },
      {
        // Event pages require camera (VRM/MediaPipe) and microphone (WebRTC)
        source: '/events/:path*',
        headers: [
          ...commonSecurityHeaders,
          { key: 'Permissions-Policy', value: 'camera=(self), microphone=(self)' },
        ],
      },
    ];
  },
};

export default nextConfig;
