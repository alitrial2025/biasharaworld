"use client";
import { ArrowLeft, Compass } from "lucide-react";
import { Brand, Button, IconBox } from "@/components/ui";
export default function NotFound() {
  return (
    <main id="main-content" className="not-found">
      <Brand />
      <IconBox icon={Compass} />
      <p className="eyebrow">404 · A little off track</p>
      <h1>
        Let’s get you back
        <br />
        to your business.
      </h1>
      <p>This page has moved, or the address isn’t quite right.</p>
      <div className="button-row">
        <Button href="/" icon={ArrowLeft}>
          Back to home
        </Button>
        <Button href="/dashboard" variant="secondary">
          Open workspace
        </Button>
      </div>
    </main>
  );
}
