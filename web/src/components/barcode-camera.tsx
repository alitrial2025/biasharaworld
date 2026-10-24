"use client";
import { useEffect, useRef, useState } from "react";
import { Button } from "./ui";
import type { IScannerControls } from "@zxing/browser";

/** Camera frames stay on this device; decoded codes are reviewed before any write. */
export function BarcodeCamera({
  onDetected,
}: {
  onDetected: (code: string) => void;
}) {
  const video = useRef<HTMLVideoElement>(null);
  const callback = useRef(onDetected);
  const [active, setActive] = useState(false);
  const [message, setMessage] = useState("");
  useEffect(() => {
    callback.current = onDetected;
  }, [onDetected]);
  useEffect(() => {
    if (!active) return;
    let cancelled = false;
    let controls: IScannerControls | undefined;
    let delivered = false;
    const element = video.current;
    void (async () => {
      try {
        if (!navigator.mediaDevices?.getUserMedia || !element)
          throw new Error(
            "Camera access requires a supported browser over HTTPS. Enter a barcode or SKU below.",
          );
        const { BrowserMultiFormatReader } = await import("@zxing/browser");
        if (cancelled) return;
        const reader = new BrowserMultiFormatReader();
        controls = await reader.decodeFromConstraints(
          { audio: false, video: { facingMode: { ideal: "environment" } } },
          element,
          (result, _error, scanner) => {
            if (!result || cancelled || delivered) return;
            delivered = true;
            scanner.stop();
            callback.current(result.getText());
            setMessage("Barcode found. Review the matching product below.");
            setActive(false);
          },
        );
        if (cancelled || delivered) controls.stop();
      } catch (error) {
        if (!cancelled) {
          setMessage(
            error instanceof Error && error.name === "NotAllowedError"
              ? "Camera permission was denied. Allow camera access in your browser or enter a barcode or SKU below."
              : "Camera unavailable. Check that a camera is connected and allowed, or enter a barcode or SKU below.",
          );
          setActive(false);
        }
      }
    })();
    return () => {
      cancelled = true;
      controls?.stop();
      const stream = element?.srcObject;
      if (stream instanceof MediaStream)
        stream.getTracks().forEach((track) => track.stop());
      if (element) element.srcObject = null;
    };
  }, [active]);
  return (
    <section className="barcode-camera" aria-label="Camera barcode scanner">
      {active && (
        <video
          ref={video}
          autoPlay
          muted
          playsInline
          aria-label="Live barcode camera"
        />
      )}
      <Button
        variant="secondary"
        onClick={() => {
          setMessage("");
          setActive(!active);
        }}
      >
        {active ? "Stop camera" : "Start camera"}
      </Button>
      <p role="status">
        {message ||
          (active
            ? "Place a barcode inside the camera frame."
            : "Use your camera or enter a barcode or SKU below.")}
      </p>
    </section>
  );
}
