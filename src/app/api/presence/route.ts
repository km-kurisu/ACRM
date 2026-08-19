import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { getUserStatus, getEffectiveStatus } from "@/lib/presence";

export async function GET() {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const status = await getUserStatus(userId);
  if (!status) {
    return NextResponse.json({ 
      status: "offline",
      last_active_at: null 
    });
  }

  const isOnline = Date.now() - new Date(status.last_active_at).getTime() < 60 * 1000;
  
  const effectiveStatus = getEffectiveStatus(
    status.status_override,
    isOnline,
    status.last_active_at,
    userId,
    userId
  );

  return NextResponse.json({
    status: effectiveStatus,
    last_active_at: status.last_active_at,
    status_override: status.status_override,
  });
}
