"use client";

import { useEffect } from "react";
import styles from "./landing-motion.module.css";

/** An original, decorative growth sketch. It carries no information or controls. */
export function LandingGrowthArt({ className = "" }: { className?: string }) {
  return (
    <svg
      className={`${styles.growthArt} ${className}`}
      viewBox="0 0 260 120"
      width="260"
      height="120"
      fill="none"
      aria-hidden="true"
      focusable="false"
    >
      <path
        className={styles.ground}
        d="M12 99C51 86 71 107 106 99C138 92 157 96 187 90C212 85 230 89 249 81"
      />
      <path
        className={styles.growthLine}
        d="M41 96C75 95 96 84 122 71C145 60 155 49 175 31C193 15 213 15 237 12"
        pathLength="1"
      />
      <path
        className={styles.travellingLine}
        d="M41 96C75 95 96 84 122 71C145 60 155 49 175 31C193 15 213 15 237 12"
        pathLength="1"
      />
      <g className={styles.sprout}>
        <path className={styles.stem} d="M128 90C129 73 136 58 143 44" />
        <path
          className={styles.leaf}
          d="M137 59C118 60 109 49 109 35C126 35 138 44 137 59Z"
        />
        <path
          className={styles.leaf}
          d="M141 48C139 31 149 20 165 17C167 33 158 45 141 48Z"
        />
        <path className={styles.leafVein} d="M118 44L137 59M141 48L157 26" />
      </g>
      <ellipse
        className={styles.seed}
        cx="128"
        cy="93"
        rx="5"
        ry="7"
        transform="rotate(27 128 93)"
      />
      <circle className={styles.node} cx="63" cy="94" r="2.5" />
      <circle className={styles.endNode} cx="237" cy="12" r="3" />
      <path className={styles.spark} d="M220 37V43M217 40H223" />
    </svg>
  );
}

/** Progressive enhancement: server-rendered content starts visible. */
export function LandingMotion() {
  useEffect(() => {
    const root = document.querySelector<HTMLElement>("[data-landing-home]");
    if (!root) return;
    const targets = Array.from(
      root.querySelectorAll<HTMLElement>("[data-reveal]"),
    );
    if (!targets.length) return;

    let observer: IntersectionObserver | undefined;
    let safetyTimer: ReturnType<typeof setTimeout> | undefined;
    let disposed = false;
    const reveal = (element: HTMLElement) => {
      element.dataset.revealState = "visible";
      observer?.unobserve(element);
    };
    const showEverything = () => {
      targets.forEach(reveal);
      observer?.disconnect();
      if (safetyTimer) clearTimeout(safetyTimer);
    };

    // Missing browser APIs and motion preferences always preserve readable content.
    if (
      typeof window.matchMedia !== "function" ||
      !("IntersectionObserver" in window)
    ) {
      showEverything();
      return;
    }
    const motionPreference = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    );
    if (motionPreference.matches) {
      showEverything();
      return;
    }

    const onMotionPreference = () => {
      if (motionPreference.matches) showEverything();
    };
    const onFocus = (event: FocusEvent) => {
      const element =
        event.target instanceof Element
          ? event.target.closest<HTMLElement>("[data-reveal]")
          : null;
      if (element) reveal(element);
    };

    try {
      observer = new IntersectionObserver(
        (entries) => {
          if (disposed) return;
          for (const entry of entries) {
            if (entry.isIntersecting) reveal(entry.target as HTMLElement);
          }
        },
        { rootMargin: "0px 0px -24px 0px", threshold: 0 },
      );
      root.classList.add("motion-ready", styles.motionReady);
      const viewportHeight =
        window.innerHeight || document.documentElement.clientHeight;
      for (const target of targets) {
        const bounds = target.getBoundingClientRect();
        // Never hide anything already visible, already passed, or currently focused.
        if (
          bounds.top >= viewportHeight + 24 &&
          !target.contains(document.activeElement)
        ) {
          observer.observe(target);
          target.dataset.revealState = "pending";
        } else reveal(target);
      }
      // A stalled observer must never leave content hidden indefinitely.
      safetyTimer = setTimeout(showEverything, 15000);
      motionPreference.addEventListener?.("change", onMotionPreference);
      document.addEventListener("focusin", onFocus);
    } catch {
      showEverything();
      root.classList.remove("motion-ready", styles.motionReady);
    }

    return () => {
      disposed = true;
      showEverything();
      root.classList.remove("motion-ready", styles.motionReady);
      motionPreference.removeEventListener?.("change", onMotionPreference);
      document.removeEventListener("focusin", onFocus);
    };
  }, []);

  return null;
}
