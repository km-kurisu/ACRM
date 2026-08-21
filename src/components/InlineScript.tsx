"use client";

import React from "react";

export function InlineScript({ html }: { html: string }) {
  return (
    <script
      // Executable in server-rendered HTML so it runs before first paint;
      // inert "text/plain" in every client render so React never treats it
      // as an executable script tag (see react-dom isScriptDataBlock).
      type={typeof window === "undefined" ? "text/javascript" : "text/plain"}
      suppressHydrationWarning
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}
