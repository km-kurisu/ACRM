import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { getUserStatus } from "@/lib/presence";

export async function GET() {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const status = await getUserStatus(userId);
  if (!status) {
    return NextResponse.json({ 
      status: "active",
      status_override: null,
      last_active_at: null,
    });
  }

  return NextResponse.json({
    status: status.status_override || "offline",
    status_override: status.status_override,
    last_active_at: status.last_active_at,
  });
}
