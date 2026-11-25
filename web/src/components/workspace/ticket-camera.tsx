"use client";

import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui";

type Detector = {
  getSupportedFormats(): Promise<string[]>;
  new (options: { formats: string[] }): {
    detect(source: HTMLVideoElement): Promise<{ rawValue: string }[]>;
  };
};

export function TicketCamera({
  disabled,
  onScan,
}: {
  disabled: boolean;
  onScan: (code: string) => void;
}) {
  const detector = (
    globalThis as typeof globalThis & { BarcodeDetector?: Detector }
  ).BarcodeDetector;
  const [active, setActive] = useState(false);
  const [error, setError] = useState("");
  const video = useRef<HTMLVideoElement>(null);
  const cleanup = useRef<() => void>(() => {});
  useEffect(() => () => cleanup.current(), []);

  if (!detector || !navigator.mediaDevices?.getUserMedia) return null;

  function start() {
    if (!detector) return;
    setActive(true);
    setError("");
    let stopped = false;
    let stream: MediaStream | undefined;
    let timer = 0;
    const release = () => {
      stopped = true;
      window.clearTimeout(timer);
      stream?.getTracks().forEach((track) => track.stop());
    };
    cleanup.current = release;
    const stop = () => {
      release();
      setActive(false);
    };
    void (async () => {
      try {
        if (!(await detector.getSupportedFormats()).includes("code_39"))
          throw new Error("This browser cannot scan ticket barcodes.");
        if (stopped) return;
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: "environment" } },
          audio: false,
        });
        const preview = video.current;
        if (stopped || !preview) {
          release();
          return;
        }
        preview.srcObject = stream;
        await preview.play();
        const reader = new detector({ formats: ["code_39"] });
        async function frame() {
          if (!preview || stopped) return;
          try {
            const codes = await reader.detect(preview);
            if (stopped) return;
            const ticket = codes.find((item) =>
              /^[A-Fa-f0-9]{16}$/.test(item.rawValue),
            );
            if (ticket) {
              stop();
              onScan(ticket.rawValue);
              return;
            }
            timer = window.setTimeout(() => void frame(), 220);
          } catch {
            if (!stopped) {
              stop();
              setError(
                "Camera scanning stopped. Enter the ticket code or use a connected scanner.",
              );
            }
          }
        }
        await frame();
      } catch {
        if (!stopped) {
          stop();
          setError(
            "Camera scanning is unavailable. Enter the ticket code or use a connected scanner.",
          );
        }
      }
    })();
  }

  return (
    <div className="industry-form">
      {active ? (
        <>
          <video
            ref={video}
            muted
            playsInline
            aria-label="Ticket scanner camera"
            style={{ width: "100%", maxWidth: 360 }}
          />
          <Button
            variant="secondary"
            onClick={() => {
              cleanup.current();
              setActive(false);
            }}
          >
            Stop camera
          </Button>
        </>
      ) : (
        <Button variant="secondary" onClick={start} disabled={disabled}>
          Scan with camera
        </Button>
      )}
      {error && <p role="alert">{error}</p>}
    </div>
  );
}
