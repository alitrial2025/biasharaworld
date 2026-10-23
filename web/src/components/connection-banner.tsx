"use client";
import { useSyncExternalStore } from "react";
import Link from "next/link";
import { useDemo } from "@/lib/store";
import { T } from "./locale";
const subscribe = (notify: () => void) => {
  window.addEventListener("online", notify);
  window.addEventListener("offline", notify);
  return () => {
    window.removeEventListener("online", notify);
    window.removeEventListener("offline", notify);
  };
};
export function ConnectionBanner() {
  useDemo();
  const online = useSyncExternalStore(
    subscribe,
    () => navigator.onLine,
    () => true,
  );
  if (online) return null;
  return (
    <div className="connection-banner" role="status">
      <span>
        <T>{"Browser reports offline"}</T> ·{" "}
        <T>Reconnect before saving. Unconfirmed requests can be retried safely.</T>
      </span>
      <Link href="/dashboard/sync">
        <T>Review activity</T>
      </Link>
    </div>
  );
}
