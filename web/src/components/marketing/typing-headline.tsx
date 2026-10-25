"use client";

import { useEffect, useState } from "react";
import { translate } from "@/components/locale";
import { useDemo } from "@/lib/store";
import styles from "./typing-headline.module.css";

/** The complete heading is always accessible; only its decorative lettering types. */
export function TypingHeadline() {
  const { state } = useDemo();
  const language = state.operations.preferences.language;
  const first = translate("Your business.", language);
  const second = translate("All together.", language);
  const firstLetters = Array.from(first);
  const secondLetters = Array.from(second);
  const total = firstLetters.length + secondLetters.length;
  // Server rendering and browsers without JavaScript receive the complete headline.
  const [characters, setCharacters] = useState(total);

  useEffect(() => {
    const preference = window.matchMedia("(prefers-reduced-motion: reduce)");
    let frame = 0;
    let start: number | undefined;
    let stopped = false;
    const firstLength = Array.from(first).length;
    const count = firstLength + Array.from(second).length;
    const letterTime = 45;
    const pause = 150;
    const finish = () => {
      stopped = true;
      cancelAnimationFrame(frame);
      setCharacters(count);
    };
    const draw = (now: number) => {
      if (stopped) return;
      start ??= now;
      const elapsed = now - start;
      const typed =
        elapsed < firstLength * letterTime
          ? Math.floor(elapsed / letterTime)
          : firstLength +
            Math.max(
              0,
              Math.floor(
                (elapsed - firstLength * letterTime - pause) / letterTime,
              ),
            );
      setCharacters(Math.min(count, typed));
      if (typed < count) frame = requestAnimationFrame(draw);
    };
    const changed = () => {
      if (preference.matches) finish();
    };
    if (preference.matches) finish();
    else frame = requestAnimationFrame(draw);
    preference.addEventListener("change", changed);
    return () => {
      stopped = true;
      cancelAnimationFrame(frame);
      preference.removeEventListener("change", changed);
    };
  }, [first, second]);

  const complete = characters >= total;
  return (
    <h1
      className={styles.headline}
      aria-label={`${first} ${second}`}
      data-typing={complete ? "complete" : "active"}
    >
      <span className={`${styles.line} ${styles.firstLine}`} aria-hidden="true">
        <span className={styles.reserve}>{first}</span>
        <span className={styles.typed}>
          {firstLetters.slice(0, characters).join("")}
          {!complete && characters <= firstLetters.length && (
            <span className={styles.caret} />
          )}
        </span>
      </span>
      <br aria-hidden="true" />
      <span
        className={`${styles.line} ${styles.secondLine}`}
        aria-hidden="true"
      >
        <span className={styles.reserve}>{second}</span>
        <span className={styles.typed}>
          {secondLetters
            .slice(0, Math.max(0, characters - firstLetters.length))
            .join("")}
          {!complete && characters > firstLetters.length && (
            <span className={styles.caret} />
          )}
        </span>
      </span>
    </h1>
  );
}
