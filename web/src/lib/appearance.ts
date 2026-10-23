"use client";
import { useSyncExternalStore } from "react";
import { useDemo } from "./store";

type Theme = "light" | "dark" | "system";
const key = "biashara.appearance";
let memory: Theme = "system";
const isTheme = (value: unknown): value is Theme =>
  value === "light" || value === "dark" || value === "system";
function read(): Theme {
  try {
    const saved = localStorage.getItem(key);
    return isTheme(saved) ? saved : memory;
  } catch {
    return memory;
  }
}
function subscribe(listener: () => void) {
  window.addEventListener("storage", listener);
  window.addEventListener("biashara-appearance", listener);
  return () => {
    window.removeEventListener("storage", listener);
    window.removeEventListener("biashara-appearance", listener);
  };
}
function subscribeSystem(listener: () => void) {
  const media = matchMedia("(prefers-color-scheme: dark)");
  media.addEventListener("change", listener);
  return () => media.removeEventListener("change", listener);
}
const systemDark = () => matchMedia("(prefers-color-scheme: dark)").matches;

export function useAppearance() {
  const { state, store } = useDemo();
  const visitor = useSyncExternalStore(
    subscribe,
    read,
    () => "system" as Theme,
  );
  const darkSystem = useSyncExternalStore(
    subscribeSystem,
    systemDark,
    () => false,
  );
  const preference = store.workspace
    ? state.operations.preferences.theme
    : visitor;
  const theme =
    preference === "system" ? (darkSystem ? "dark" : "light") : preference;
  async function setTheme(value: Theme) {
    if (store.workspace)
      await store.command({ type: "preferences", theme: value });
    memory = value;
    try {
      localStorage.setItem(key, value);
    } catch {
      /* Appearance still works for this page session. */
    }
    window.dispatchEvent(new Event("biashara-appearance"));
  }
  return { theme, setTheme, busy: store.busy || store.hasPending };
}
