import { clerkClient } from "@clerk/nextjs/server";
import { db } from "./server";

/**
 * Ensures a mirror row exists in public.users for the given Clerk user.
 * The schema's FKs (user_status, user_preferences, owner_id columns) all
 * reference public.users, but no /api/clerk-sync webhook exists yet — so
 * writers call this before inserting into FK-bound tables.
 */
export async function ensureUserRow(userId: string): Promise<void> {
  const { data: existing } = await db
    .from("users")
    .select("id")
    .eq("id", userId)
    .maybeSingle();
  if (existing) return;

  const client = await clerkClient();
  const user = await client.users.getUser(userId);

  const fullName = [user.firstName, user.lastName].filter(Boolean).join(" ").trim();
  const initials =
    `${user.firstName?.charAt(0) ?? ""}${user.lastName?.charAt(0) ?? ""}`.toUpperCase() ||
    user.emailAddresses[0]?.emailAddress.charAt(0).toUpperCase() ||
    "";

  const { error } = await db.from("users").upsert(
    {
      id: user.id,
      email: user.emailAddresses[0]?.emailAddress ?? null,
      full_name: fullName,
      image_url: user.imageUrl,
      username: user.username,
      initials,
      role: (user.publicMetadata?.role as string) || "member",
      updated_at: new Date().toISOString(),
    },
    { onConflict: "id" }
  );

  if (error) throw new Error(error.message);
}
