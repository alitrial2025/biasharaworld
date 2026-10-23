"use client";
import {
  createContext,
  useContext,
  type ReactNode,
  type ComponentProps,
} from "react";
import { useDemo } from "@/lib/store";
import catalog from "@/lib/sw.json";
const Language = createContext("en");
const dictionary: Record<string, string> = catalog;
const lower = Object.fromEntries(
  Object.entries(dictionary).map(([key, value]) => [key.toLowerCase(), value]),
);
export function translate(value: string, language: string): string {
  if (language !== "sw") return value;
  if (dictionary[value]) return dictionary[value];
  const trimmed = value.trim().replace(/\s+/g, " ");
  const count = trimmed.match(
    /^(\d+) (customers|left|available|points|products)$/,
  );
  if (count)
    return `${count[1]} ${{ customers: "wateja", left: "zimebaki", available: "zinapatikana", points: "pointi", products: "bidhaa" }[count[2]]}`;
  const translated = dictionary[trimmed] ?? lower[trimmed.toLowerCase()];
  return translated
    ? value.replace(
        value.trim(),
        trimmed === trimmed.toUpperCase()
          ? translated.toUpperCase()
          : translated,
      )
    : value;
}
export function LocaleProvider({ children }: { children: ReactNode }) {
  const { state } = useDemo();
  return (
    <Language.Provider value={state.operations.preferences.language}>
      {children}
    </Language.Provider>
  );
}
export function T({ children }: { children: ReactNode }) {
  const language = useContext(Language);
  return typeof children === "string"
    ? translate(children, language)
    : children;
}
function useAttributes<
  P extends { title?: string; "aria-label"?: string; placeholder?: string },
>(props: P): P {
  const language = useContext(Language);
  return {
    ...props,
    ...(props.title ? { title: translate(props.title, language) } : {}),
    ...(props["aria-label"]
      ? { "aria-label": translate(props["aria-label"], language) }
      : {}),
    ...(props.placeholder
      ? { placeholder: translate(props.placeholder, language) }
      : {}),
  };
}
export function LocalButton(props: ComponentProps<"button">) {
  return <button {...useAttributes(props)} />;
}
export function LocalInput(props: ComponentProps<"input">) {
  return <input {...useAttributes(props)} />;
}
export function LocalSelect(props: ComponentProps<"select">) {
  return <select {...useAttributes(props)} />;
}
export function LocalTextarea(props: ComponentProps<"textarea">) {
  return <textarea {...useAttributes(props)} />;
}
