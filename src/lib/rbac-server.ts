import { auth, clerkClient } from "@clerk/nextjs/server";

async function getRole(userId: string): Promise<string> {
  const client = await clerkClient();
  const user = await client.users.getUser(userId);
  return (user.publicMetadata?.role as string) || "member";
}

export async function requireAdmin(): Promise<string> {
  const { userId } = await auth();
  if (!userId) {
    throw new Error("UNAUTHENTICATED");
  }
  const role = await getRole(userId);
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
