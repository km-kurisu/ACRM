import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { updateLastActive } from "@/lib/presence";

export async function POST() {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    await updateLastActive(userId);
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to update status" },
      { status: 500 }
    );
  }
}
