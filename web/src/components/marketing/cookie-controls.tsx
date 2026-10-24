"use client";
import { useState } from "react";
import { Button } from "@/components/ui";
import { useAppearance } from "@/lib/appearance";
import styles from "./policy-pages.module.css";

export function CookieControls() {
  const { theme, setTheme, busy } = useAppearance();
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  return (
    <div className={styles.controls} aria-label="Storage preferences">
      <p>
        <strong>
          Essential account and recovery storage: always needed when you use
          those features.
        </strong>{" "}
        Disabling it in your browser can prevent sign-in or safe saving.
      </p>
      <p>
        <strong>Optional analytics and advertising: not enabled.</strong> There
        are no optional tracking categories to accept or reject in this release.
      </p>
      <p>
        Your current appearance is {theme === "dark" ? "dark" : "light"}. You
        can use your device setting instead. For a signed-in business this also
        updates your saved theme preference.
      </p>
      <div className={styles.buttons}>
        <Button
          variant="secondary"
          disabled={busy}
          onClick={async () => {
            setError("");
            setMessage("");
            try {
              await setTheme("system");
              setMessage("Appearance now follows your device setting.");
            } catch (e) {
              setError(
                e instanceof Error
                  ? e.message
                  : "Could not save the preference. Try again.",
              );
            }
          }}
        >
          Use device theme
        </Button>
        <Button variant="secondary" href="/dashboard/preferences">
          Workspace preferences
        </Button>
      </div>
      {message && <p role="status">{message}</p>}
      {error && <p role="alert">{error}</p>}
    </div>
  );
}
