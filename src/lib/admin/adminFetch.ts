/**
 * The one place where the admin UI reacts to an expired or missing session.
 *
 * `adminFetch` is `fetch` for /api/admin/* calls: on 401 it sends the browser
 * to the login page and never settles, so the caller neither shows an error
 * nor renders a half-empty page while the redirect happens. Every other
 * response is returned as is.
 */
export const ADMIN_LOGIN_PATH = "/admin/login";

let redirecting = false;

/** Full page load of the login page (drops any in-memory admin state). */
export function redirectToLogin() {
  if (redirecting || typeof window === "undefined") {
    return;
  }
  redirecting = true;
  window.location.replace(new URL(ADMIN_LOGIN_PATH, window.location.origin).href);
}

export async function adminFetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
  const response = await fetch(input, init);

  if (response.status === 401) {
    redirectToLogin();
    return new Promise<Response>(() => undefined);
  }

  return response;
}
