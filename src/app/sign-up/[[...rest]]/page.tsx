"use client";

import React from "react";
import { SignUp } from "@/lib/rbac";
import { Card } from "@/components/ui/card";

export default function SignUpPage() {
  return (
    <div className="flex min-h-[70vh] items-center justify-center">
      <Card className="glass w-full max-w-md p-6">
        <SignUp />
      </Card>
    </div>
  );
}
