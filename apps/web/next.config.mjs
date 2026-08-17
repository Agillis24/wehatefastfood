import createNextIntlPlugin from 'next-intl/plugin';

const withNextIntl = createNextIntlPlugin('./src/i18n/request.ts');

/** @type {import('next').NextConfig} */
const nextConfig = {
  /**
   * Static export. The whole site is HTML, CSS and a little inline script, so
   * it can be served by GitHub Pages for nothing.
   *
   * This is what removed the tier-2 translation endpoint - but the endpoint was
   * already the riskiest thing in the brief. Eight reviewed languages are worth
   * more than two hundred unreviewed ones, so the constraint and the judgement
   * pointed the same way.
   */
  output: 'export',

  /**
   * GitHub Pages serves directories, not extensionless files: it will answer
   * /en/ with /en/index.html but not /en with /en.html. Trailing slashes make
   * Next emit the directory form.
   */
  trailingSlash: true,

  reactStrictMode: true,
  poweredByHeader: false,
  transpilePackages: ['@wff/content', '@wff/i18n'],

  // typedRoutes stays off: every content route is computed from the content
  // graph, so it can only be typed by casting, which hides real mistakes.
  typedRoutes: false,

  eslint: {
    // The whole repo is linted from the root with one flat config, which is
    // where the no-bare-strings and no-framework-in-content rules live.
    ignoreDuringBuilds: true,
  },
};

export default withNextIntl(nextConfig);
