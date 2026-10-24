"use client";
import { T, LocalButton } from "@/components/locale";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import {
  ArrowRight,
  BarChart3,
  BookOpen,
  ChevronDown,
  CircleHelp,
  HeartHandshake,
  Laptop,
  Menu,
  Package,
  ShoppingBag,
  Smartphone,
  Sparkles,
  Store,
  Users,
  X,
} from "lucide-react";
import { Brand, Button } from "@/components/ui";
import { ThemeToggle } from "@/components/theme-toggle";

const menus = {
  Product: [
    {
      href: "/features",
      icon: ShoppingBag,
      title: "One connected workspace",
      text: "Sales, stock, money and more",
    },
    {
      href: "/features#insights",
      icon: Sparkles,
      title: "Insights that make sense",
      text: "Find your next smart move",
    },
    {
      href: "/download",
      icon: Smartphone,
      title: "Web + Android",
      text: "Your business, wherever you are",
    },
    {
      href: "/dashboard",
      icon: Laptop,
      title: "Open workspace",
      text: "Sign in to your business",
    },
  ],
  Solutions: [
    {
      href: "/solutions/retail",
      icon: Store,
      title: "Retail shops & dukas",
      text: "Everyday tools for everyday trade",
    },
    {
      href: "/solutions/minimarkets",
      icon: ShoppingBag,
      title: "Mini markets",
      text: "Keep busy shelves in sync",
    },
    {
      href: "/solutions/wholesale",
      icon: Package,
      title: "Wholesalers",
      text: "Bigger orders, a clearer picture",
    },
    {
      href: "/solutions/services",
      icon: Users,
      title: "Service businesses",
      text: "People, payments and progress",
    },
  ],
  Resources: [
    {
      href: "/resources",
      icon: BookOpen,
      title: "The business notebook",
      text: "Practical ideas, simply explained",
    },
    {
      href: "/help",
      icon: CircleHelp,
      title: "Help centre",
      text: "Find your feet and your answers",
    },
    {
      href: "/about",
      icon: HeartHandshake,
      title: "Why BiasharaOS",
      text: "Built around your ambition",
    },
    {
      href: "/contact",
      icon: BarChart3,
      title: "Talk to us",
      text: "Tell us about your business",
    },
  ],
};

export function SiteHeader() {
  const [open, setOpen] = useState<string | null>(null);
  const [mobile, setMobile] = useState(false);
  const ref = useRef<HTMLElement>(null);
  useEffect(() => {
    function close(e: MouseEvent) {
      if (!ref.current?.contains(e.target as Node)) {
        setOpen(null);
        setMobile(false);
      }
    }
    function escape(e: KeyboardEvent) {
      if (e.key === "Escape") {
        setOpen(null);
        setMobile(false);
      }
    }
    document.addEventListener("mousedown", close);
    document.addEventListener("keydown", escape);
    return () => {
      document.removeEventListener("mousedown", close);
      document.removeEventListener("keydown", escape);
    };
  }, []);
  return (
    <header className="site-header" ref={ref}>
      <div className="container nav-inner">
        <Brand />
        <nav
          className={`site-nav ${mobile ? "mobile-open" : ""}`}
          aria-label="Main navigation"
        >
          <T>
            {Object.entries(menus).map(([label, items]) => (
              <div className="nav-dropdown" key={label}>
                <LocalButton
                  className={open === label ? "nav-link active" : "nav-link"}
                  onClick={() => setOpen(open === label ? null : label)}
                  aria-expanded={open === label}
                >
                  <T>{label}</T>
                  <ChevronDown size={13} />
                </LocalButton>

                <T>
                  {open === label && (
                    <div className="dropdown-panel">
                      <T>
                        {items.map((item) => (
                          <Link
                            key={item.href}
                            href={item.href}
                            onClick={() => {
                              setOpen(null);
                              setMobile(false);
                            }}
                          >
                            <span className="dropdown-icon">
                              <item.icon size={19} />
                            </span>
                            <span>
                              <strong>
                                <T>{item.title}</T>
                              </strong>
                              <small>
                                <T>{item.text}</T>
                              </small>
                            </span>
                            <ArrowRight size={14} />
                          </Link>
                        ))}
                      </T>
                    </div>
                  )}
                </T>
              </div>
            ))}
          </T>

          <Link
            href="/pricing"
            className="nav-link"
            onClick={() => setMobile(false)}
          >
            <T>Pricing</T>
          </Link>
          <div className="mobile-auth">
            <Button href="/login" variant="secondary">
              <T>Log in</T>
            </Button>
            <Button href="/signup" arrow>
              <T>Get started</T>
            </Button>
          </div>
        </nav>
        <div className="nav-auth">
          <ThemeToggle />
          <Link href="/login">
            <T>Log in</T>
          </Link>
          <Button href="/signup" size="small" arrow>
            <T>Get started</T>
          </Button>
        </div>
        <LocalButton
          className="mobile-menu icon-button"
          aria-label={mobile ? "Close menu" : "Open menu"}
          aria-expanded={mobile}
          onClick={() => {
            setMobile(!mobile);
            setOpen(null);
          }}
        >
          <T>{mobile ? <X size={23} /> : <Menu size={23} />}</T>
        </LocalButton>
      </div>
    </header>
  );
}

export function SiteFooter() {
  return (
    <footer className="site-footer">
      <div className="container">
        <div className="footer-top">
          <div className="footer-brand">
            <Brand />
            <p>
              <T>For the people who keep</T>
              <br />
              <T>our neighbourhoods moving.</T>
            </p>
            <span className="location-note">
              <span className="status-dot" />
              <T>Made for everyday entrepreneurs.</T>
            </span>
          </div>

          <T>
            {[
              [
                "Product",
                ["Features", "/features"],
                ["Pricing", "/pricing"],
                ["Web workspace", "/dashboard"],
                ["Android app", "/download"],
              ],
              [
                "Your business",
                ["Retail shops", "/solutions/retail"],
                ["Mini markets", "/solutions/minimarkets"],
                ["Wholesalers", "/solutions/wholesale"],
                ["Services", "/solutions/services"],
              ],
              [
                "Get to know us",
                ["About BiasharaOS", "/about"],
                ["Business notebook", "/resources"],
                ["Help centre", "/help"],
                ["Contact", "/contact"],
              ],
            ].map(([title, ...links]) => (
              <div className="footer-links" key={title as string}>
                <h3>
                  <T>{title}</T>
                </h3>

                <T>
                  {(links as string[][]).map(([label, href]) => (
                    <Link key={href} href={href}>
                      <T>{label}</T>
                    </Link>
                  ))}
                </T>
              </div>
            ))}
          </T>
        </div>
        <div className="footer-bottom">
          <span>
            <T>©</T> <T>{new Date().getFullYear()}</T>{" "}
            <T>BiasharaOS. Everyday progress.</T>
          </span>
          <div>
            <Link href="/privacy">
              <T>Privacy</T>
            </Link>
            <Link href="/cookies">
              <T>Cookies & storage</T>
            </Link>
            <Link href="/terms">
              <T>Terms</T>
            </Link>
            <span className="footer-demo">
              <T>Early access</T>
            </span>
          </div>
        </div>
        <p className="quiet-note">
          Essential account and browser storage keeps sign-in, baskets and safe
          retries working. Optional advertising and analytics tracking is not
          enabled. <Link href="/cookies">Storage details and choices</Link>.
        </p>
      </div>
    </footer>
  );
}

export function CTABanner({
  title = "Here’s to your next chapter.",
  text = "A little less juggling. A lot more growing. Make room for what’s next.",
}: {
  title?: string;
  text?: string;
}) {
  return (
    <section className="cta-section container">
      <div className="cta-banner">
        <div>
          <span className="eyebrow">
            <T>YOUR BUSINESS, GROWING</T>
          </span>
          <h2>
            <T>{title}</T>
          </h2>
          <p>
            <T>{text}</T>
          </p>
        </div>
        <div>
          <Button href="/signup" variant="white" size="large" arrow>
            <T>Let’s get started</T>
          </Button>
          <Link href="/dashboard">
            <T>Already have an account? Open workspace</T>
            <ArrowRight size={14} />
          </Link>
        </div>
        <span className="cta-orbit orbit-one" />
        <span className="cta-orbit orbit-two" />
      </div>
    </section>
  );
}
