"use client";

import { Check } from "lucide-react";
import { setColorTheme, useColorTheme, type ColorTheme } from "@/hooks/use-theme";
import { cn } from "@/lib/utils";

const THEMES: {
  value: ColorTheme;
  label: string;
  description: string;
  swatches: string[];
}[] = [
  {
    value: "default",
    label: "Mono",
    description: "Neutral black and white",
    swatches: ["#f5f5f5", "#7a7a7a", "#181818"],
  },
  {
    value: "tokyo",
    label: "Tokyo Night",
    description: "Indigo, neon blue, and violet",
    swatches: ["#1a1b26", "#7aa2f7", "#bb9af7"],
  },
  {
    value: "sakura",
    label: "Sakura",
    description: "Blush pink and deep plum",
    swatches: ["#fff7f9", "#c43d77", "#3f2a33"],
  },
];

export function ThemePicker() {
  const active = useColorTheme();

  return (
    <div className="grid gap-3 sm:grid-cols-3">
      {THEMES.map((theme) => {
        const selected = active === theme.value;
        return (
          <button
            key={theme.value}
            type="button"
            aria-pressed={selected}
            onClick={() => setColorTheme(theme.value)}
            className={cn(
              "group relative rounded-xl border p-3 text-left transition-all",
              selected
                ? "border-primary bg-primary/5 ring-2 ring-primary/30"
                : "border-border hover:border-primary/40 hover:bg-accent/40"
            )}
          >
            <div className="mb-3 flex items-center gap-1.5">
              {theme.swatches.map((color) => (
                <span
                  key={color}
                  className="size-5 rounded-full border border-black/10 shadow-sm"
                  style={{ backgroundColor: color }}
                />
              ))}
            </div>
            <p className="text-sm font-medium">{theme.label}</p>
            <p className="mt-0.5 text-xs text-muted-foreground">{theme.description}</p>
            {selected && (
              <span className="absolute top-2.5 right-2.5 grid size-5 place-items-center rounded-full bg-primary text-primary-foreground">
                <Check className="size-3" />
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
