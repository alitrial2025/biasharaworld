"use client";
import { T } from "@/components/locale";

import Image from "next/image";
import Link from "next/link";
import {
  ArrowRight,
  ArrowUpRight,
  BarChart3,
  Check,
  CheckCircle2,
  ChevronRight,
  CreditCard,
  Heart,
  Laptop,
  Package,
  ShoppingBag,
  Smartphone,
  Sparkles,
  Store,
  Wallet,
} from "lucide-react";
import {
  Badge,
  Button,
  CheckList,
  IconBox,
  ProductArt,
  SalesChart,
} from "@/components/ui";
import { CTABanner } from "./site-shell";
import { faqs } from "@/lib/data";

export function MiniDashboard({ large = false }: { large?: boolean }) {
  return (
    <div className={`mini-dashboard ${large ? "mini-large" : ""}`}>
      <div className="browser-chrome">
        <span />
        <span />
        <span />
        <div>
          <T>BiasharaOS workspace</T>
        </div>
        <Badge tone="green" dot>
          <T>Example workspace</T>
        </Badge>
      </div>
      <div className="mini-content">
        <div className="mini-heading">
          <div>
            <small>
              <T>GOOD MORNING, WANJIKU</T>
            </small>
            <h3>
              <T>Your business, at a glance.</T>
            </h3>
          </div>
          <span className="avatar avatar-photo" />
        </div>
        <div className="mini-stats">
          <T>
            {[
              ["Total Sales", "12,450", "12%", "mint"],
              ["Profit", "3,890", "8%", "blue"],
              ["Expenses", "2,300", "5%", "rose"],
              ["Pending Debts", "5,600", "5 customers", "sand"],
            ].map(([label, amount, growth, tone]) => (
              <div key={label} className={`mini-stat bg-${tone}`}>
                <span>
                  <T>{label}</T>
                </span>
                <strong>
                  <small>
                    <T>KES</T>
                  </small>
                  <T> </T> <T>{amount}</T>
                </strong>
                <em>
                  <T>{growth.includes("%") ? "↗ " : ""}</T> <T>{growth}</T>
                </em>
              </div>
            ))}
          </T>
        </div>
        <div className="mini-chart-heading">
          <strong>
            <T>Sales Trend</T>
          </strong>
          <span>
            <T>This week</T>
            <ChevronRight size={12} />
          </span>
        </div>
        <SalesChart mini />
        <div className="mini-recent">
          <div>
            <span className="tiny-check">
              <Check size={12} />
            </span>
            <div>
              <strong>
                <T>Mary Wambui</T>
              </strong>
              <small>
                <T>M-Pesa · Sale #1048</T>
              </small>
            </div>
          </div>
          <strong>
            <T>+ KES 1,250</T>
          </strong>
        </div>
      </div>
    </div>
  );
}

export function FAQList({ items = faqs.slice(0, 5) }: { items?: string[][] }) {
  return (
    <div className="faq-list">
      <T>
        {items.map(([question, answer]) => (
          <details key={question}>
            <summary>
              <T>{question}</T>
              <span>
                <T>+</T>
              </span>
            </summary>
            <p>
              <T>{answer}</T>
            </p>
          </details>
        ))}
      </T>
    </div>
  );
}

export function HomePage() {
  return (
    <>
      <section className="hero-section">
        <div className="container hero-grid">
          <div className="hero-copy">
            <div className="hero-eyebrow">
              <span className="status-dot" />
              <T>BIG TOOLS. EVERYDAY BUSINESS.</T>
            </div>
            <h1>
              <T>Your business.</T>
              <br />
              <span>
                <T>All together.</T>
              </span>
            </h1>
            <p>
              <T>
                From your first sale to your next big step. Sell, manage stock,
                track money and see what’s possible—all in one simple workspace.
              </T>
            </p>
            <div className="button-row">
              <Button href="/signup" size="large" arrow>
                <T>Start your next chapter</T>
              </Button>
              <Button href="/dashboard" size="large" variant="secondary">
                <T>Open workspace</T>
                <ArrowUpRight size={17} />
              </Button>
            </div>
            <div className="hero-footnote">
              <span>
                <Check size={14} />
                <T>No credit card needed</T>
              </span>
              <span>
                <Laptop size={14} />
                <T>Web + Android</T>
              </span>
            </div>
            <div className="hero-small-proof">
              <span className="proof-mark">
                <Store size={17} />
              </span>
              <span>
                <T>Built for small businesses.</T>
                <br />
                <strong>
                  <T>And the big ambitions behind them.</T>
                </strong>
              </span>
            </div>
          </div>
          <div className="hero-visual">
            <div className="hero-photo">
              <Image
                src="/images/shop.webp"
                alt="A Kenyan shop owner managing her business on a phone"
                width={1024}
                height={1536}
                priority
              />
              <div>
                <span>
                  <T>EVERYDAY ENTREPRENEUR</T>
                </span>
                <strong>
                  <T>A shop full of possibility.</T>
                </strong>
              </div>
            </div>
            <div className="hero-dashboard">
              <MiniDashboard />
            </div>
            <div className="floating-sale">
              <span className="float-check">
                <Check size={18} />
              </span>
              <div>
                <strong>
                  <T>Another sale. Another step.</T>
                </strong>
                <small>
                  <T>KES 1,250 · Example payment record</T>
                </small>
              </div>
              <Sparkles size={16} />
            </div>
            <div className="hero-spark spark-one">
              <T>✳</T>
            </div>
          </div>
        </div>
      </section>

      <section className="business-strip">
        <div className="container">
          <p>
            <T>Whatever you’re building,</T>
            <br />
            <strong>
              <T>there’s room for you here.</T>
            </strong>
          </p>
          <div>
            <T>
              {[
                [Store, "Retail shops"],
                [ShoppingBag, "Mini markets"],
                [Package, "Wholesalers"],
                [Heart, "Service businesses"],
              ].map(([Icon, label]) => {
                const I = Icon as typeof Store;
                return (
                  <span key={label as string}>
                    <I size={21} />
                    <T>{label as string}</T>
                  </span>
                );
              })}
            </T>
          </div>
        </div>
      </section>

      <section className="section container" id="features">
        <div className="section-heading split-heading">
          <div>
            <span className="eyebrow">
              <T>LESS JUGGLING. MORE GROWING.</T>
            </span>
            <h2>
              <T>Everything your business needs.</T>
              <br />
              <span className="muted-heading">
                <T>Finally, in one place.</T>
              </span>
            </h2>
          </div>
          <p>
            <T>Good tools should make your day easier.</T>
            <br />
            <T>We bring the pieces together so you</T>
            <br className="desktop-only" />
            <T>can focus on your next move.</T>
          </p>
        </div>
        <div className="feature-bento">
          <Link href="/features#sales" className="bento-card bento-sales">
            <IconBox icon={ShoppingBag} />
            <h3>
              <T>Every sale,</T>
              <br />
              <T>beautifully simple.</T>
            </h3>
            <p>
              <T>
                From a quick checkout to a clear receipt. Keep cash, card and
                M-Pesa sales together.
              </T>
            </p>
            <div className="sales-demo-card">
              <div className="tiny-label">
                <T>A LITTLE MOMENTUM</T>
              </div>
              <div className="bento-product">
                <ProductArt art={0} name="Soko Maize Flour" />
                <div>
                  <strong>
                    <T>Soko Maize Flour</T>
                  </strong>
                  <span>
                    <T>2 kg · 2 items</T>
                  </span>
                </div>
                <strong>
                  <T>KES 360</T>
                </strong>
              </div>
              <div className="bento-product">
                <ProductArt art={1} name="Blue Band" />
                <div>
                  <strong>
                    <T>Blue Band</T>
                  </strong>
                  <span>
                    <T>500 g · 1 item</T>
                  </span>
                </div>
                <strong>
                  <T>KES 350</T>
                </strong>
              </div>
              <div className="mini-pay">
                <CheckCircle2 size={15} />
                <T>Payment record example</T>
                <strong>
                  <T>KES 710</T>
                </strong>
              </div>
            </div>
            <span className="card-link">
              <T>Make selling simpler</T>
              <ArrowUpRight size={16} />
            </span>
          </Link>
          <Link href="/features#stock" className="bento-card bento-stock">
            <IconBox icon={Package} tone="blue" />
            <h3>
              <T>Know your shelves.</T>
              <br />
              <T>Stay one step ahead.</T>
            </h3>
            <p>
              <T>
                See what’s moving, what’s low, and what deserves a spot on your
                next order.
              </T>
            </p>
            <div className="stock-snippet">
              <T>
                {[
                  [0, "Soko Maize Flour", "42 in stock", "green"],
                  [2, "Coca-Cola", "8 in stock", "amber"],
                  [4, "Sunlight Soap", "Out of stock", "red"],
                ].map(([art, name, status, tone]) => (
                  <div key={name as string}>
                    <ProductArt
                      art={art as number}
                      name={name as string}
                      small
                    />
                    <span>
                      <strong>
                        <T>{name as string}</T>
                      </strong>
                      <small className={`text-${tone}`}>
                        <T>{status as string}</T>
                      </small>
                    </span>
                    <span className={`stock-dot dot-${tone}`} />
                  </div>
                ))}
              </T>
            </div>
          </Link>
          <Link href="/features#money" className="bento-card bento-money">
            <IconBox icon={Wallet} tone="amber" />
            <h3>
              <T>A clearer picture</T>
              <br />
              <T>of your money.</T>
            </h3>
            <p>
              <T>
                Track expenses and customer balances. Know what came in, went
                out, and is still owed.
              </T>
            </p>
            <div className="money-pill">
              <span className="mini-avatar">
                <T>JM</T>
              </span>
              <span>
                <T>John Mwangi</T>
                <small>
                  <T>Outstanding balance</T>
                </small>
              </span>
              <strong>
                <T>KES 1,200</T>
              </strong>
            </div>
            <span className="card-link">
              <T>Stay on top of your money</T>
              <ArrowUpRight size={16} />
            </span>
          </Link>
          <Link href="/features#insights" className="bento-card bento-ai">
            <span className="ai-orb">
              <Sparkles size={23} />
            </span>
            <Badge tone="purple">
              <T>A LITTLE EXTRA CLARITY</T>
            </Badge>
            <h3>
              <T>Good questions.</T>
              <br />
              <T>Brighter next steps.</T>
            </h3>
            <p>
              <T>
                Explore your numbers with BiasharaAI. Find the products,
                patterns and possibilities worth a closer look.
              </T>
            </p>
            <div className="ai-question">
              <T>What should I restock?</T>
              <ArrowUpRight size={14} />
            </div>
            <small>
              <T>Summaries from saved records. External AI coming later.</T>
            </small>
          </Link>
        </div>
      </section>

      <section className="connected-section">
        <div className="container connected-grid">
          <div>
            <span className="eyebrow">
              <T>ONE BUSINESS. MORE POSSIBILITIES.</T>
            </span>
            <h2>
              <T>Small screen.</T>
              <br />
              <T>Big screen.</T>
              <br />
              <span className="text-green">
                <T>Your kind of workday.</T>
              </span>
            </h2>
            <p>
              <T>
                At the counter, in the stockroom, or planning your next step at
                home. BiasharaOS fits around the way you work.
              </T>
            </p>
            <CheckList
              items={[
                "A familiar experience on web and Android",
                "More space for reports, team tools and bulk exports",
                "Your essential business tools, brought together",
              ]}
            />
            <p className="quiet-note">
              <T>
                Sign in to the same business to keep your saved records together
                across the web and app.
              </T>
            </p>
            <Button href="/download" variant="secondary" arrow>
              <T>Find your fit</T>
            </Button>
          </div>
          <div className="devices-composition">
            <div className="device-desktop">
              <MiniDashboard large />
            </div>
            <div className="device-phone">
              <div className="phone-island" />
              <Image
                src="/images/app-dashboard.webp"
                alt="The matching BiasharaOS Android dashboard"
                width={393}
                height={852}
              />
            </div>
            <span className="device-tag">
              <Laptop size={15} />
              <T>Your desk.</T>
              <Smartphone size={15} />
              <T>Your pocket.</T>
            </span>
          </div>
        </div>
      </section>

      <section className="section container">
        <div className="section-heading centered">
          <span className="eyebrow">
            <T>A SIMPLE START</T>
          </span>
          <h2>
            <T>Your next chapter is closer than you think.</T>
          </h2>
          <p>
            <T>Start small. Get comfortable. Make it yours.</T>
          </p>
        </div>
        <div className="steps-grid">
          <T>
            {[
              [
                "01",
                Store,
                "Make yourself at home",
                "Add your shop details, products and people. A clear starting point for a more organised day.",
              ],
              [
                "02",
                CreditCard,
                "Find your everyday rhythm",
                "Make a sale, check your shelves, record an expense. Keep the little things moving.",
              ],
              [
                "03",
                BarChart3,
                "See what’s possible",
                "Look back at your numbers, notice what’s working, and plan your next step with more confidence.",
              ],
            ].map(([number, Icon, title, text]) => {
              const I = Icon as typeof Store;
              return (
                <div className="step-card" key={number as string}>
                  <span className="step-number">
                    <T>{number as string}</T>
                  </span>
                  <IconBox icon={I} />
                  <h3>
                    <T>{title as string}</T>
                  </h3>
                  <p>
                    <T>{text as string}</T>
                  </p>
                </div>
              );
            })}
          </T>
        </div>
      </section>

      <section className="story-section container">
        <div className="story-image">
          <Image
            src="/images/shop.webp"
            alt="Shopkeeper in a neighbourhood grocery shop"
            width={1024}
            height={1536}
          />
          <span>
            <T>BUILT FOR THE EVERYDAY ENTREPRENEUR</T>
          </span>
        </div>
        <div className="story-copy">
          <span className="eyebrow">
            <T>BEHIND EVERY SHOP, A BIGGER STORY.</T>
          </span>
          <h2>
            <T>More than products</T>
            <br />
            <T>on a shelf.</T>
          </h2>
          <p>
            <T>
              It’s school fees. A growing family. A second branch, one day.
              We’re building BiasharaOS for the everyday entrepreneurs turning
              small steps into something bigger.
            </T>
          </p>
          <div className="story-person">
            <span className="avatar avatar-photo" />
            <div>
              <strong>
                <T>Wanjiku General Shop</T>
              </strong>
              <span>
                <T>Nairobi, Kenya · Illustrative shop story</T>
              </span>
            </div>
          </div>
          <Link href="/about" className="text-link">
            <T>Get to know BiasharaOS</T>
            <ArrowRight size={16} />
          </Link>
        </div>
      </section>

      <section className="section container faq-section">
        <div>
          <span className="eyebrow">
            <T>A FEW GOOD QUESTIONS</T>
          </span>
          <h2>
            <T>A little clarity</T>
            <br />
            <T>before you begin.</T>
          </h2>
          <p>
            <T>Still curious about something?</T>
          </p>
          <Link href="/help" className="text-link">
            <T>Visit the help centre</T>
            <ArrowRight size={16} />
          </Link>
        </div>
        <FAQList />
      </section>
      <CTABanner />
    </>
  );
}
