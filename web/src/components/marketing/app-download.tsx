import { ArrowDownToLine, Smartphone } from "lucide-react";
import release from "@/lib/android-release.json";
import styles from "./app-download.module.css";

function PlayIcon() {
  return (
    <svg viewBox="0 0 24 26" width="26" height="28" aria-hidden="true">
      <path d="M1 1 14 13 1 25Z" fill="#3bccff" />
      <path d="m1 1 16 9-3 3Z" fill="#42e695" />
      <path d="m14 13 3 3L1 25Z" fill="#ff5268" />
      <path d="m14 13 3-3 6 3-6 3Z" fill="#ffcf4a" />
    </svg>
  );
}
function AppleIcon() {
  return (
    <svg
      viewBox="0 0 24 28"
      width="26"
      height="28"
      fill="currentColor"
      aria-hidden="true"
    >
      <path d="M17.3 4.2c1-1.2 1.7-2.8 1.5-4.2-1.4.1-3.1.9-4.1 2.1-.9 1-1.8 2.6-1.6 4.1 1.6.1 3.2-.8 4.2-2ZM21.6 20.6c-.5 1.2-.8 1.8-1.5 2.9-1 1.5-2.4 3.4-4.1 3.4-1.5 0-1.9-1-4-1s-2.6 1-4.1 1c-1.7 0-3-1.7-4-3.2C1 19.5.2 13.4 2 10.1c1.3-2.4 3.3-3.8 5.3-3.8 1.7 0 2.8 1 4.2 1 1.3 0 2.2-1 4.2-1 1.6 0 3.4.9 4.7 2.4-4.1 2.2-3.5 8.1 1.2 9.9Z" />
    </svg>
  );
}

export function StoreBadges() {
  return (
    <div className={styles.stores} aria-label="App store availability">
      <div className={styles.badge}>
        <PlayIcon />
        <span>
          <strong>Google Play</strong>
          <small>Coming soon</small>
        </span>
      </div>
      <div className={styles.badge}>
        <AppleIcon />
        <span>
          <strong>App Store</strong>
          <small>Coming soon</small>
        </span>
      </div>
    </div>
  );
}

export function AndroidDownload() {
  const available =
    release.available &&
    /^\/downloads\/biasharaos-[\d.]+-release\.apk$/.test(release.href) &&
    /^[a-f0-9]{64}$/.test(release.sha256);
  return (
    <div className={styles.download}>
      {available ? (
        <>
          <a className="btn btn-dark" href={release.href} download>
            <ArrowDownToLine size={18} />
            Download for Android
          </a>
          <p>
            Version {release.version} · {(release.bytes / 1048576).toFixed(1)}{" "}
            MB · Android {release.minimumAndroid}+
          </p>
          <details>
            <summary>Installation & download integrity</summary>
            <p>
              Download the APK on your Android phone, open it, and allow
              installation from your browser when Android asks. Sign in with the
              same account you use on the web.
            </p>
            <p>SHA-256</p>
            <code className={styles.hash}>{release.sha256}</code>
          </details>
        </>
      ) : (
        <>
          <button className="btn btn-dark" disabled>
            <Smartphone size={18} />
            Android release coming soon
          </button>
          <p>
            Android {release.minimumAndroid}+ · Use your workspace on the web
            while the release is prepared.
          </p>
        </>
      )}
      <StoreBadges />
    </div>
  );
}
