/**
 * Routes that exist for signed-in users and have no business in search.
 *
 * One list, two consumers: robots.txt disallows them and the sitemap filters
 * them out. They used to be written separately, and they drifted — robots.txt
 * said "do not crawl /admin" while the sitemap submitted /admin, /dashboard,
 * /login, /signup and /write to Google. Search Console reports that pairing as
 * an error, and it is: the site was asking for the pages to be indexed and
 * refusing to let them be read in the same breath.
 *
 * Adding a route here covers both files. That is the point.
 */
export const PRIVATE_ROUTES = [
  '/login',
  '/signup',
  '/write',
  '/dashboard',
  '/admin',
] as const;

/**
 * True for a private route and anything beneath it.
 *
 * Compares against a trailing slash so `/admin` and `/admin/` both match while
 * a hypothetical `/administrators` does not — the build emits directory-style
 * URLs, so both shapes turn up.
 */
export function isPrivateRoute(pathname: string): boolean {
  const path = pathname.endsWith('/') ? pathname.slice(0, -1) : pathname;
  return PRIVATE_ROUTES.some((route) => path === route || path.startsWith(`${route}/`));
}
