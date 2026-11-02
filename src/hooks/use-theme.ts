"use client";

import { useSyncExternalStore } from "react";

const THEME_KEY = "theme";
const COLOR_THEME_KEY = "theme-color";

export type Theme = "light" | "dark";
export type ColorTheme = "default" | "tokyo" | "sakura";

function getTheme(): Theme {
  if (typeof window === "undefined") return "dark";
  const saved = localStorage.getItem(THEME_KEY);
  if (saved === "light" || saved === "dark") return saved;
  return "dark";
}

function getColorTheme(): ColorTheme {
  if (typeof window === "undefined") return "default";
  const saved = localStorage.getItem(COLOR_THEME_KEY);
  if (saved === "tokyo" || saved === "sakura") return saved;
  return "default";
}

function applyTheme(theme: Theme) {
  document.documentElement.classList.remove("light", "dark");
  document.documentElement.classList.add(theme);
}

function applyColorTheme(theme: ColorTheme) {
  document.documentElement.classList.remove("theme-tokyo", "theme-sakura");
  if (theme !== "default") document.documentElement.classList.add(`theme-${theme}`);
}

function subscribe(callback: () => void) {
  const handle = () => {
    applyTheme(getTheme());
    applyColorTheme(getColorTheme());
    callback();
  };
  window.addEventListener("storage", handle);
  return () => window.removeEventListener("storage", handle);
}

export function useTheme(): Theme {
  return useSyncExternalStore(subscribe, getTheme, () => "dark");
}

export function useColorTheme(): ColorTheme {
  return useSyncExternalStore(subscribe, getColorTheme, () => "default");
}

export function setTheme(theme: Theme) {
  localStorage.setItem(THEME_KEY, theme);
  applyTheme(theme);
  window.dispatchEvent(new Event("storage"));
}

export function setColorTheme(theme: ColorTheme) {
  if (theme === "default") {
    localStorage.removeItem(COLOR_THEME_KEY);
  } else {
    localStorage.setItem(COLOR_THEME_KEY, theme);
  }
  applyColorTheme(theme);
  window.dispatchEvent(new Event("storage"));
}
