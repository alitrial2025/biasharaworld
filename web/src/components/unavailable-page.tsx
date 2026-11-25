import Link from "next/link";
import { ArrowLeft, Compass, Store } from "lucide-react";
import { T } from "@/components/locale";
import { Brand } from "@/components/ui";

export function UnavailablePage({ shop = false }: { shop?: boolean }) {
  const Icon = shop ? Store : Compass;

  return (
    <main id="main-content" className="unavailable-page">
      <header className="unavailable-header">
        <Brand />
      </header>
      <section className="unavailable-card" aria-labelledby="unavailable-title">
        <div className="unavailable-status">
          <span className="unavailable-icon">
            <Icon size={26} aria-hidden="true" />
          </span>
          <span>404</span>
        </div>
        <h1 id="unavailable-title">
          <T>{shop ? "Shop unavailable" : "Page not found"}</T>
        </h1>
        <p>
          <T>
            {shop
              ? "Check the shop link or ask the business for its current address. Draft shops become public after the owner publishes them."
              : "Check the address or return to the BiasharaOS home page."}
          </T>
        </p>
        <div className="unavailable-actions">
          <Link className="btn btn-primary" href="/">
            <ArrowLeft size={17} aria-hidden="true" /> <T>Back to home</T>
          </Link>
          <Link
            className="btn btn-secondary"
            href={shop ? "/dashboard/online-shop" : "/help"}
          >
            <T>{shop ? "Open Shop builder" : "Help centre"}</T>
          </Link>
        </div>
      </section>
    </main>
  );
}
