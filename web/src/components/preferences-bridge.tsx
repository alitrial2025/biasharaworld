"use client";
import { useEffect } from "react";
import { useDemo } from "@/lib/store";
export function PreferencesBridge() {
  const { state } = useDemo();
  const p = state.operations.preferences;
  useEffect(() => {
    const root = document.documentElement;
    const media = matchMedia("(prefers-color-scheme: dark)");
    const apply = () => {
      root.dataset.theme =
        p.theme === "system" ? (media.matches ? "dark" : "light") : p.theme;
    };
    apply();
    media.addEventListener("change", apply);
    root.lang = p.language === "sw" ? "sw" : "en";
    root.dataset.language = p.language;
    root.style.setProperty("--text-scale", String(p.textSize / 100));
    return () => media.removeEventListener("change", apply);
  }, [p.theme, p.language, p.textSize]);
  return null;
}
