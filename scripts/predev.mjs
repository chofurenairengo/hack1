import { mkdirSync, writeFileSync } from 'fs';

// Next.js 16.2.4 appends "/dev" to distDir in dev phase but doesn't pre-create it.
// next-server.js reads these manifests before webpack compilation writes them → ENOENT crash.
// Write stubs so the server can start; webpack will overwrite with real values.

mkdirSync('.next/dev/server', { recursive: true });
mkdirSync('.next/dev/cache/webpack/server-development', { recursive: true });
mkdirSync('.next/dev/cache/webpack/client-development', { recursive: true });

writeFileSync(
  '.next/dev/server/middleware-manifest.json',
  JSON.stringify({ version: 3, middleware: {}, functions: {}, sortedMiddleware: [], pages: {} }),
);

writeFileSync(
  '.next/dev/prerender-manifest.json',
  JSON.stringify(
    { version: 4, routes: {}, dynamicRoutes: {}, notFoundRoutes: [], preview: {} },
    null,
    2,
  ),
);
