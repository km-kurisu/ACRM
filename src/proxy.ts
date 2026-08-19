import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

const isAdminRoute = createRouteMatcher([
  "/settings/team(.*)",
  "/admin(.*)",
]);

export default clerkMiddleware(async (auth, req) => {
  const { pathname } = req.nextUrl;
  
  // Skip auth for sign-in/sign-up pages
  if (!pathname.startsWith("/sign-in") && !pathname.startsWith("/sign-up")) {
    await auth.protect();
  }

  // RBAC: Check admin-only routes
  const { sessionClaims } = await auth();
  const role = (sessionClaims?.metadata?.role as string) || "member";

  if (isAdminRoute(req) && role !== "admin") {
    return NextResponse.redirect(new URL("/dashboard", req.url));
  }
});

export const config = {
  matcher: [
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    "/(api|trpc)(.*)",
  ],
};
