"use client";
import { Button } from "@/components/ui";
export default function ErrorPage({ reset }: { reset: () => void }) {
  return (
    <main className="error-page" id="main-content">
      <span className="eyebrow">A LITTLE PAUSE</span>
      <h1>Let’s try that again.</h1>
      <p>
        Something interrupted this page. Try again to reconnect to your
        workspace. Review any unconfirmed changes before submitting them again.
      </p>
      <Button onClick={reset}>Try again</Button>
      <Button href="/" variant="secondary">
        Back to home
      </Button>
    </main>
  );
}
