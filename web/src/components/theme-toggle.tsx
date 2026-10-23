"use client";
import { Moon, Sun } from "lucide-react";
import { useAppearance } from "@/lib/appearance";
import { LocalButton, T } from "./locale";
import { useToast } from "./ui";

export function ThemeToggle() {
  const { theme, setTheme, busy } = useAppearance();
  const toast = useToast();
  const dark = theme === "dark";
  const label = dark ? "Switch to light mode" : "Switch to dark mode";
  return (
    <LocalButton
      type="button"
      className="theme-toggle"
      aria-label={label}
      title={label}
      disabled={busy}
      onClick={async () => {
        try {
          await setTheme(dark ? "light" : "dark");
        } catch {
          toast("Could not save your appearance. Please retry.");
        }
      }}
    >
      {dark ? (
        <Sun size={17} aria-hidden="true" />
      ) : (
        <Moon size={17} aria-hidden="true" />
      )}
      <span>
        <T>{dark ? "Light mode" : "Dark mode"}</T>
      </span>
    </LocalButton>
  );
}
