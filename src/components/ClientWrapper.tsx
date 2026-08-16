"use client";

import React from "react";
import { ClerkProvider } from "@clerk/nextjs";

export default function ClientWrapper({ children }: { children: React.ReactNode }) {
  return <ClerkProvider>{children}</ClerkProvider>;
}
