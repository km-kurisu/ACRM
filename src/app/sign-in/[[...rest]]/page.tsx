"use client";

import React from "react";
import { SignIn } from "@/lib/rbac";
import { Card } from "@/components/ui/card";

export default function SignInPage() {
  return (
    <div className="flex min-h-[70vh] items-center justify-center">
      <Card className="glass w-full max-w-md p-6">
        <SignIn />
      </Card>
    </div>
  );
}
