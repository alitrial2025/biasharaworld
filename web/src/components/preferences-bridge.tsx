"use client";
import { useEffect } from "react";
import { useDemo } from "@/lib/store";
import { useAppearance } from "@/lib/appearance";
export function PreferencesBridge() {
  const { state } = useDemo();
  const p = state.operations.preferences;
  const { theme } = useAppearance();
  useEffect(() => {
    const root = document.documentElement;
    root.dataset.theme = theme;
    root.lang = p.language === "sw" ? "sw" : "en";
    root.dataset.language = p.language;
    root.style.setProperty("--text-scale", String(p.textSize / 100));
  }, [theme, p.language, p.textSize]);
  return null;
}
