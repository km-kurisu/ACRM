import { auth } from "@clerk/nextjs/server";

export async function requireAdmin(): Promise<string> {
  const { userId, sessionClaims } = await auth();
  if (!userId) {
    throw new Error("UNAUTHENTICATED");
  }
  const role = (sessionClaims?.metadata?.role as string) || "member";
  if (role !== "admin") {
    throw new Error("FORBIDDEN");
  }
  return userId;
}

export async function requireUser(): Promise<string> {
  const { userId } = await auth();
  if (!userId) {
    throw new Error("UNAUTHENTICATED");
  }
  return userId;
}
