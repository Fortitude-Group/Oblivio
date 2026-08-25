import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// The site has one canonical home. Anyone who lands on a *.vercel.app URL (the
// deployment host, or an old shared link) is bounced to the custom domain with a
// permanent redirect, so the hosting URL never shows in the address bar.
const CANONICAL =
  process.env.OBSERVATORY_BASE_URL ?? "https://oblivio.fortitude-omnis.group";
const CANONICAL_HOST = (() => {
  try {
    return new URL(CANONICAL).host;
  } catch {
    return "oblivio.fortitude-omnis.group";
  }
})();

export function middleware(req: NextRequest) {
  const host = req.headers.get("host") ?? "";
  // Guard against a loop if the canonical host is itself a vercel.app URL.
  if (host.endsWith(".vercel.app") && host !== CANONICAL_HOST) {
    const url = req.nextUrl.clone();
    url.protocol = "https:";
    url.host = CANONICAL_HOST;
    url.port = "";
    return NextResponse.redirect(url, 308);
  }
  return NextResponse.next();
}

export const config = {
  // Redirect page and API requests; skip Next's own static assets.
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
