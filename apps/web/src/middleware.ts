import createMiddleware from 'next-intl/middleware';
import { routing } from './i18n/routing';

export default createMiddleware(routing);

export const config = {
  // Everything except API routes, Next internals and anything with a file
  // extension. Keeping static assets out of the middleware matters for the
  // performance budget - the middleware runs on every matched request.
  matcher: ['/((?!api|_next|_vercel|.*[.].*).*)'],
};
