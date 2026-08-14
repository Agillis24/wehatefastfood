import createNextIntlPlugin from 'next-intl/plugin';

const withNextIntl = createNextIntlPlugin('./src/i18n/request.ts');

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  // The content packages are workspace TypeScript sources, not prebuilt dists,
  // during development. Next compiles them alongside the app.
  transpilePackages: ['@wff/content', '@wff/i18n'],
  typedRoutes: true,
  eslint: {
    // We lint the whole repo from the root with one flat config, which is where
    // the no-bare-strings and no-framework-in-content rules live. Letting Next
    // run a second, separately-configured pass would give us two sources of
    // truth that disagree. `npm run check` is the gate.
    ignoreDuringBuilds: true,
  },
};

export default withNextIntl(nextConfig);
