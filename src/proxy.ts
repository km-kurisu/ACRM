import { clerkMiddleware, createRouteMatcher, clerkClient } from "@clerk/nextjs/server";
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

  // RBAC: Check admin-only routes by fetching user's publicMetadata from Clerk
  const { userId } = await auth();
  if (isAdminRoute(req) && userId) {
    const client = await clerkClient();
    const user = await client.users.getUser(userId);
    const role = (user.publicMetadata?.role as string) || "member";
    if (role !== "admin") {
      return NextResponse.redirect(new URL("/dashboard", req.url));
    }
  }
});

export const config = {
  matcher: [
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    "/(api|trpc)(.*)",
  ],
};
