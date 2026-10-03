import { NextResponse } from "next/server";
import { buildSetSessionCookie } from "./cookie";

/** Finish OAuth with a local session and remove the one-time authorization state. */
export function oauthRedirect(url: URL, sessionToken?: string): NextResponse {
  const response = NextResponse.redirect(url);
  response.cookies.delete("watcha_oauth_state");
  response.cookies.delete("watcha_oauth_intent");
  // ResponseCookies rewrites Set-Cookie when mutated. Append the session last,
  // otherwise deleting the OAuth cookies silently removes the login cookie.
  if (sessionToken) {
    response.headers.append("set-cookie", buildSetSessionCookie(sessionToken));
  }
  return response;
}
