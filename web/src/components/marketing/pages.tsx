"use client";
import {
  T,
  LocalButton,
  LocalSelect,
  LocalTextarea,
} from "@/components/locale";

import Image from "next/image";
import Link from "next/link";
import { ExpandedTools } from "./expanded-tools";
import { useState, type FormEvent } from "react";
import {
  ArrowRight,
  ArrowUpRight,
  BarChart3,
  BookOpen,
  Check,
  CheckCircle2,
  CircleHelp,
  Globe2,
  HeartHandshake,
  Laptop,
  Leaf,
  Mail,
  MapPin,
  Package,
  ShieldCheck,
  ShoppingBag,
  Smartphone,
  Sparkles,
  Store,
  Truck,
  Users,
  Wallet,
} from "lucide-react";
import {
  Badge,
  Button,
  CheckList,
  Field,
  IconBox,
  SearchField,
} from "@/components/ui";
import { articles, faqs } from "@/lib/data";
import { CTABanner } from "./site-shell";
import { FAQList, MiniDashboard } from "./home";
import { AndroidDownload } from "./app-download";
import { IndustryDirectory } from "./industry-directory";

function PageIntro({
  eyebrow,
  title,
  text,
  children,
}: {
  eyebrow: string;
  title: string;
  text: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="page-intro container">
      <span className="eyebrow">
        <T>{eyebrow}</T>
      </span>
      <h1>
        <T>{title}</T>
      </h1>
      <p>
        <T>{text}</T>
      </p>
      <T>{children}</T>
    </div>
  );
}

export function FeaturesPage() {
  return (
    <>
      <PageIntro
        eyebrow="THE EVERYDAY, CONNECTED"
        title="A little less juggling. A lot more clarity."
        text="The tools you need to run your business, with room for everything it can become."
      >
        <Button href="/dashboard" arrow>
          <T>Open workspace</T>
        </Button>
      </PageIntro>
      <div className="container feature-nav">
        <T>
          {["Sales", "Stock", "Money", "People", "Insights"].map((s) => (
            <a key={s} href={`#${s.toLowerCase()}`}>
              <T>{s}</T>
              <ArrowUpRight size={13} />
            </a>
          ))}
        </T>
      </div>

      <T>
        {[
          {
            id: "sales",
            eyebrow: "SELL WITH CONFIDENCE",
            title: "Keep the line moving.\nKeep the details clear.",
            text: "Find a product, build a basket and review a payment method in a few simple steps. Every confirmed sale updates stock and appears in your sales history.",
            checks: [
              "Record cash, card and M-Pesa payments received",
              "Searchable transactions and clear receipts",
              "Downloadable CSV sales exports",
            ],
            image: "app-dashboard",
            icon: ShoppingBag,
            tone: "mint",
          },
          {
            id: "stock",
            eyebrow: "A WELL-STOCKED BUSINESS",
            title: "Know what you have.\nSee what you need.",
            text: "Move from guesswork to a clear catalogue. Track quantities, selling prices, costs and reorder points, all in one place.",
            checks: [
              "Search, filter and organise your catalogue",
              "Low-stock and out-of-stock views",
              "Add products, restock and export your list",
            ],
            image: "app-inventory",
            icon: Package,
            tone: "blue",
          },
          {
            id: "money",
            eyebrow: "EVERY SHILLING COUNTS",
            title: "See where your\nmoney is going.",
            text: "The small expenses matter, too. Keep transport, utilities and supplies beside the bigger picture of your sales and customer balances.",
            checks: [
              "A simple expense ledger with categories",
              "Customer credit and recorded repayments",
              "Sales, profit and expense reports from your records",
            ],
            image: "app-dashboard",
            icon: Wallet,
            tone: "sand",
          },
          {
            id: "people",
            eyebrow: "BETTER BUSINESS, TOGETHER",
            title: "Make room for\nyour people.",
            text: "Keep your customers, suppliers and team organised. Prepare restock orders and give everyone a clearer view of the work ahead.",
            checks: [
              "Customer profiles and outstanding balances",
              "Your supplier contacts, quotes and purchase orders",
              "Team membership and role-based access",
            ],
            image: "app-inventory",
            icon: Users,
            tone: "rose",
          },
          {
            id: "insights",
            eyebrow: "YOUR NEXT SMART MOVE",
            title: "Turn good questions\ninto a clearer picture.",
            text: "Review recorded sales and stock, or ask for a summary of your business. External AI is not connected yet.",
            checks: [
              "Readable sales and product performance charts",
              "A conversational assistant interface",
              "Summaries based on your recorded business activity",
            ],
            image: "app-assistant",
            icon: Sparkles,
            tone: "lavender",
          },
        ].map((item, i) => (
          <section
            key={item.id}
            id={item.id}
            className={`feature-detail container ${i % 2 ? "detail-reverse" : ""}`}
          >
            <div>
              <IconBox icon={item.icon} />
              <span className="eyebrow">
                <T>{item.eyebrow}</T>
              </span>
              <h2>
                <T>
                  {item.title.split("\n").map((s, j) => (
                    <span key={s}>
                      <T>{j > 0 && <br />}</T> <T>{s}</T>
                    </span>
                  ))}
                </T>
              </h2>
              <p>
                <T>{item.text}</T>
              </p>
              <CheckList items={item.checks} />
              <Link href="/dashboard" className="text-link">
                <T>Open workspace</T>
                <ArrowRight size={16} />
              </Link>
            </div>
            <div className={`feature-visual bg-${item.tone}`}>
              <div className="feature-phone">
                <Image
                  src={`/images/${item.image}.webp`}
                  alt={`${item.id} screen in the matching Android app`}
                  width={393}
                  height={852}
                />
              </div>
              <span className="feature-stamp">
                <CheckCircle2 size={16} />
                <T>Web + Android experience</T>
              </span>
            </div>
          </section>
        ))}
      </T>

      <ExpandedTools />
      <CTABanner />
    </>
  );
}

export const solutionData: Record<
  string,
  {
    title: string;
    eyebrow: string;
    text: string;
    icon: typeof Store;
    benefits: string[];
    color: string;
  }
> = {
  retail: {
    title: "Small shop. Big possibilities.",
    eyebrow: "FOR RETAIL SHOPS & DUKAS",
    text: "Your shop is part of the neighbourhood. Keep everyday sales, familiar faces and well-stocked shelves in one simple workspace.",
    icon: Store,
    benefits: [
      "A quick checkout for your everyday products",
      "Stock reminders before the busy hours",
      "Customer balances that are easy to follow",
      "Simple reports for planning the next restock",
    ],
    color: "mint",
  },
  minimarkets: {
    title: "Busy shelves. A clearer day.",
    eyebrow: "FOR MINI MARKETS",
    text: "More products shouldn’t mean more guesswork. Keep a growing catalogue organised and your next move in sight.",
    icon: ShoppingBag,
    benefits: [
      "Searchable product lists with categories",
      "Selling prices, costs and reorder points",
      "CSV exports for a broader view",
      "A web workspace with room for your team",
    ],
    color: "blue",
  },
  wholesale: {
    title: "Bigger orders. Better organised.",
    eyebrow: "FOR WHOLESALERS",
    text: "Bring stock, customers and purchasing into the same picture. Make room for bigger baskets and longer-term relationships.",
    icon: Truck,
    benefits: [
      "Clear customer balances and recorded repayments",
      "Purchase order drafts and receiving previews",
      "Inventory quantities and cost visibility",
      "Reports and exports on a larger screen",
    ],
    color: "sand",
  },
  services: {
    title: "Your people. Your progress.",
    eyebrow: "FOR SERVICE BUSINESSES",
    text: "A good business starts with good relationships. Keep your customers, expenses and daily progress together.",
    icon: HeartHandshake,
    benefits: [
      "A simple customer directory",
      "Expenses organised by category",
      "A shared view of your team and roles",
      "Sales and money reports in one workspace",
    ],
    color: "lavender",
  },
};
export function SolutionsPage() {
  return (
    <>
      <PageIntro
        eyebrow="YOUR KIND OF BUSINESS"
        title="There’s room for you here."
        text="Different shops. Different days. The same ambition to build something that lasts."
      />
      <IndustryDirectory />
      <div className="container solutions-grid">
        <T>
          {Object.entries(solutionData).map(([slug, s]) => (
            <Link
              href={`/solutions/${slug}`}
              className={`solution-card bg-${s.color}`}
              key={slug}
            >
              <IconBox icon={s.icon} />
              <h2>
                <T>{s.eyebrow.replace("FOR ", "").toLowerCase()}</T>
              </h2>
              <p>
                <T>{s.text}</T>
              </p>
              <span className="text-link">
                <T>Explore your fit</T>
                <ArrowRight size={16} />
              </span>
            </Link>
          ))}
        </T>
      </div>
      <CTABanner />
    </>
  );
}
export function SolutionPage({ slug }: { slug: string }) {
  const s = solutionData[slug];
  return (
    <>
      <section className="container solution-hero">
        <div>
          <span className="eyebrow">
            <T>{s.eyebrow}</T>
          </span>
          <h1>
            <T>{s.title}</T>
          </h1>
          <p>
            <T>{s.text}</T>
          </p>
          <div className="button-row">
            <Button href="/signup" arrow>
              <T>Make it yours</T>
            </Button>
            <Button href="/dashboard" variant="secondary">
              <T>Open workspace</T>
            </Button>
          </div>
        </div>
        <div className={`solution-hero-visual bg-${s.color}`}>
          <IconBox icon={s.icon} />
          <MiniDashboard />
        </div>
      </section>
      <section className="section container solution-benefits">
        <div>
          <span className="eyebrow">
            <T>BUILT AROUND YOUR DAY</T>
          </span>
          <h2>
            <T>A little more organised.</T>
            <br />
            <T>A lot more possible.</T>
          </h2>
          <p>
            <T>
              Start with what you need today. Explore the tools that can support
              your next step.
            </T>
          </p>
        </div>
        <div>
          <T>
            {s.benefits.map((b, i) => (
              <div className="benefit-row" key={b}>
                <span>
                  <T>0</T> <T>{i + 1}</T>
                </span>
                <h3>
                  <T>{b}</T>
                </h3>
                <CheckCircle2 size={20} />
              </div>
            ))}
          </T>
        </div>
      </section>
      <CTABanner />
    </>
  );
}

const plans = [
  {
    name: "Starter",
    price: 0,
    text: "For your first clear view of the business.",
    features: [
      "Sales & payment previews",
      "Product catalogue & stock alerts",
      "Customer balances",
      "Basic sales overview",
      "Web + Android experience",
    ],
  },
  {
    name: "Growth",
    price: 990,
    text: "For a busier shop and a bigger ambition.",
    features: [
      "Everything in Starter",
      "Advanced report previews",
      "Suppliers & purchase orders",
      "Expense categories & CSV exports",
      "BiasharaAI interface",
      "Team role previews",
    ],
  },
  {
    name: "Business",
    price: 2490,
    text: "For the next chapter of your business.",
    features: [
      "Everything in Growth",
      "Expanded team tools",
      "Business performance views",
      "Export-ready business records",
      "Multi-branch tools planned",
      "Priority support planned",
    ],
  },
];
export function PricingPage() {
  const [annual, setAnnual] = useState(false);
  return (
    <>
      <PageIntro
        eyebrow="ROOM TO START. ROOM TO GROW."
        title="Simple plans. Bigger possibilities."
        text="Choose the space that fits your business today. There’s always room for your next chapter."
      >
        <div className="billing-toggle">
          <LocalButton
            className={!annual ? "active" : ""}
            onClick={() => setAnnual(false)}
          >
            <T>Monthly</T>
          </LocalButton>
          <LocalButton
            className={annual ? "active" : ""}
            onClick={() => setAnnual(true)}
          >
            <T>Yearly</T>
            <span>
              <T>Save 20%</T>
            </span>
          </LocalButton>
        </div>
        <p className="pricing-disclosure">
          <T>
            Proposed launch pricing · Billing is not connected in this preview.
          </T>
        </p>
      </PageIntro>
      <div className="container pricing-grid">
        <T>
          {plans.map((p, i) => (
            <div
              className={`pricing-card ${i === 1 ? "popular" : ""}`}
              key={p.name}
            >
              <T>
                {i === 1 && (
                  <span className="popular-label">
                    <Sparkles size={13} />
                    <T>A LITTLE MORE POSSIBILITY</T>
                  </span>
                )}
              </T>

              <IconBox icon={i === 0 ? Leaf : i === 1 ? Sparkles : Store} />
              <h2>
                <T>{p.name}</T>
              </h2>
              <p>
                <T>{p.text}</T>
              </p>
              <div className="plan-price">
                <span>
                  <T>KES</T>
                </span>
                <strong>
                  <T>
                    {(p.price * (annual ? 0.8 : 1)).toLocaleString("en-KE", {
                      maximumFractionDigits: 0,
                    })}
                  </T>
                </strong>
                <small>
                  <T>/ month</T>
                </small>
              </div>
              <span className="plan-frequency">
                <T>
                  {p.price === 0
                    ? "A simple place to begin"
                    : annual
                      ? "Billed yearly · proposed pricing"
                      : "Billed monthly · proposed pricing"}
                </T>
              </span>
              <Button
                href={`/signup?plan=${p.name}`}
                variant={i === 1 ? "primary" : "secondary"}
                arrow
              >
                <T>{i === 0 ? "Start with the basics" : `Explore ${p.name}`}</T>
              </Button>
              <div className="plan-divider" />
              <CheckList items={p.features} />
            </div>
          ))}
        </T>
      </div>
      <section className="container comparison-section">
        <div className="section-heading centered">
          <span className="eyebrow">
            <T>A CLOSER LOOK</T>
          </span>
          <h2>
            <T>The right tools for your next step.</T>
          </h2>
        </div>
        <div className="table-scroll">
          <table className="comparison-table">
            <thead>
              <tr>
                <th>
                  <T>What’s included</T>
                </th>

                <T>
                  {plans.map((p) => (
                    <th key={p.name}>
                      <T>{p.name}</T>
                    </th>
                  ))}
                </T>
              </tr>
            </thead>
            <tbody>
              <T>
                {[
                  ["Sales & inventory", true, true, true],
                  ["Customer balances", true, true, true],
                  ["Basic reports", true, true, true],
                  ["Expense exports", false, true, true],
                  ["Purchase order drafts", false, true, true],
                  ["Team role previews", false, true, true],
                  ["Expanded business tools", false, false, true],
                ].map(([label, ...values]) => (
                  <tr key={label as string}>
                    <td>
                      <T>{label}</T>
                    </td>

                    <T>
                      {values.map((v, i) => (
                        <td key={i}>
                          <T>
                            {v ? (
                              <Check size={17} />
                            ) : (
                              <span className="muted">
                                <T>—</T>
                              </span>
                            )}
                          </T>
                        </td>
                      ))}
                    </T>
                  </tr>
                ))}
              </T>
            </tbody>
          </table>
        </div>
      </section>
      <section className="section container pricing-faq">
        <h2>
          <T>A few questions about plans.</T>
        </h2>
        <FAQList items={[faqs[4], faqs[0], faqs[3], faqs[2]]} />
      </section>
      <CTABanner />
    </>
  );
}

export function AboutPage() {
  return (
    <>
      <PageIntro
        eyebrow="EVERYDAY ENTREPRENEURS. EXTRAORDINARY AMBITION."
        title="Behind every business, a bigger story."
        text="We’re building BiasharaOS for the people who open early, know their customers by name, and turn small steps into something that lasts."
      />
      <div className="container about-photo">
        <Image
          src="/images/shop.webp"
          alt="A shopkeeper surrounded by her grocery stock"
          width={1024}
          height={1536}
          priority
        />
        <div>
          <span className="eyebrow">
            <T>YOUR WORK MATTERS.</T>
          </span>
          <h2>
            <T>Your tools</T>
            <br />
            <T>should show it.</T>
          </h2>
        </div>
      </div>
      <section className="section container about-story">
        <h2>
          <T>A little less friction.</T>
          <br />
          <T>A lot more possibility.</T>
        </h2>
        <div>
          <p>
            <T>
              Running a small business means holding a lot in your head. What
              sold. What is low. Who still owes you. Which supplier to call
              next.
            </T>
          </p>
          <p>
            <T>
              We believe the tools for that work should feel clear, approachable
              and connected. Not another complicated thing to manage, but a
              useful part of the day.
            </T>
          </p>
          <p>
            <T>
              BiasharaOS brings the essentials together on Android and the web,
              with an experience shaped around the realities of everyday trade.
            </T>
          </p>
        </div>
      </section>
      <section className="section container values-grid">
        <T>
          {[
            [
              HeartHandshake,
              "Built around people",
              "A business is more than its numbers. We design for the people behind the counter and the customers across it.",
            ],
            [
              Globe2,
              "Accessible by design",
              "A phone, a laptop, a familiar language. The experience should meet you where you are.",
            ],
            [
              ShieldCheck,
              "Clear from the beginning",
              "Good relationships start with honesty. We clearly identify available tools, proposed plans and future integrations.",
            ],
          ].map(([Icon, title, text]) => {
            const I = Icon as typeof Store;
            return (
              <div key={title as string}>
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
      </section>
      <CTABanner />
    </>
  );
}

export function ContactPage() {
  const [submitted, setSubmitted] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [reference, setReference] = useState("");
  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const d = new FormData(e.currentTarget);
    setBusy(true);
    setError("");
    try {
      const r = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(Object.fromEntries(d)),
        signal: AbortSignal.timeout(30000),
      });
      const data = await r.json();
      if (!r.ok) throw new Error(data.error);
      setReference(data.id);
      setSubmitted(true);
    } catch (e) {
      setError(
        e instanceof Error
          ? e.message
          : "Message unconfirmed. Please try again later.",
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <PageIntro
        eyebrow="LET’S TALK BUSINESS"
        title="Big questions. Little questions. We’re listening."
        text="Tell us what you’re building, what you need, or what would make your working day a little easier."
      />
      <section className="container contact-grid">
        <div>
          <IconBox icon={Mail} />
          <h2>
            <T>Start a conversation.</T>
          </h2>
          <p>
            <T>
              Have a product question? Exploring BiasharaOS for your business?
              Leave a note for the BiasharaOS team.
            </T>
          </p>
          <div className="contact-info">
            <MapPin size={18} />
            <span>
              <T>Built with Kenyan businesses in mind.</T>
            </span>
          </div>
          <Link href="/help" className="help-callout">
            <CircleHelp size={22} />
            <div>
              <strong>
                <T>Looking for a quick answer?</T>
              </strong>
              <span>
                <T>Visit the help centre</T>
              </span>
            </div>
            <ArrowUpRight size={17} />
          </Link>
          <p className="quiet-note">
            <T>
              Messages are saved privately for the team. Email notifications and
              guaranteed response times are not available yet.
            </T>
          </p>
        </div>
        <div className="contact-card">
          {error && (
            <p role="alert" className="operation-error">
              {error}
            </p>
          )}
          <T>
            {submitted ? (
              <div className="form-success">
                <IconBox icon={CheckCircle2} />
                <h2>
                  <T>Your message is saved.</T>
                </h2>
                <p>
                  <T>
                    Thank you for your message. Keep this reference for
                    follow-up: {reference}
                  </T>
                </p>
                <Button variant="secondary" onClick={() => setSubmitted(false)}>
                  <T>Write another message</T>
                </Button>
              </div>
            ) : (
              <form onSubmit={submit}>
                <div className="form-grid">
                  <Field
                    label="Your name"
                    name="name"
                    placeholder="e.g. Wanjiku Njeri"
                    required
                    autoComplete="name"
                  />
                  <Field
                    label="Email address"
                    name="email"
                    type="email"
                    placeholder="you@example.com"
                    required
                    autoComplete="email"
                  />
                </div>
                <Field
                  label="Business name"
                  name="business"
                  placeholder="What do you call your business?"
                />
                <div className="field">
                  <label htmlFor="contact-topic">
                    <T>What can we help with?</T>
                  </label>
                  <LocalSelect
                    id="contact-topic"
                    className="input"
                    name="topic"
                  >
                    <option>
                      <T>Getting started</T>
                    </option>
                    <option>
                      <T>Product feedback</T>
                    </option>
                    <option>Privacy & data request</option>
                    <option>Account deletion</option>
                    <option>Report a security issue</option>
                    <option>
                      <T>Partnerships</T>
                    </option>
                    <option>
                      <T>Something else</T>
                    </option>
                  </LocalSelect>
                </div>
                <div className="field">
                  <label htmlFor="message">
                    <T>Your message</T>
                  </label>
                  <LocalTextarea
                    id="message"
                    className="input"
                    name="message"
                    rows={5}
                    required
                    placeholder="Tell us a little about it…"
                  />
                </div>
                <Button type="submit" arrow>
                  <T>{busy ? "Saving…" : "Send message"}</T>
                </Button>
                <p className="form-note">
                  <T>By sending this message, you agree to our</T>
                  <Link href="/privacy">
                    <T>privacy policy</T>
                  </Link>
                  <T>.</T>
                </p>
              </form>
            )}
          </T>
        </div>
      </section>
    </>
  );
}

export function HelpPage() {
  const [query, setQuery] = useState("");
  const filtered = faqs.filter((f) =>
    f.join(" ").toLowerCase().includes(query.toLowerCase()),
  );
  return (
    <>
      <PageIntro
        eyebrow="A LITTLE HELP GOES A LONG WAY"
        title="Let’s find your answer."
        text="Get comfortable with accounts, stock and sales, and find a clearer way forward."
      >
        <SearchField
          value={query}
          onChange={setQuery}
          placeholder="Search sales, stock, payments…"
          className="help-search"
        />
      </PageIntro>
      <div className="container help-categories">
        <T>
          {[
            [ShoppingBag, "Making a sale"],
            [Package, "Managing stock"],
            [Users, "Your customers"],
            [Wallet, "Plans & payments"],
          ].map(([Icon, title]) => {
            const I = Icon as typeof Store;
            return (
              <LocalButton
                onClick={() =>
                  setQuery(
                    title === "Making a sale"
                      ? "sale"
                      : title === "Managing stock"
                        ? "stock"
                        : title === "Your customers"
                          ? "customer"
                          : "pricing",
                  )
                }
                key={title as string}
              >
                <IconBox icon={I} />
                <strong>
                  <T>{title as string}</T>
                </strong>
                <ArrowRight size={15} />
              </LocalButton>
            );
          })}
        </T>
      </div>
      <section className="container help-answers">
        <div className="section-heading">
          <h2>
            <T>
              {query ? `Answers for “${query}”` : "A few things worth knowing."}
            </T>
          </h2>
          <p>
            <T>{filtered.length}</T> <T>useful answers</T>
          </p>
        </div>

        <T>
          {filtered.length ? (
            <FAQList items={filtered} />
          ) : (
            <div className="empty-state">
              <CircleHelp size={32} />
              <h3>
                <T>No matching answers yet.</T>
              </h3>
              <p>
                <T>
                  Try “accounts”, “stock” or “payments”, or open your workspace.
                </T>
              </p>
              <Button variant="secondary" onClick={() => setQuery("")}>
                <T>Show all answers</T>
              </Button>
            </div>
          )}
        </T>
      </section>
      <section className="container help-bottom">
        <h3>
          <T>Still need a little help?</T>
        </h3>
        <p>
          <T>We’d like to hear what would make the product clearer.</T>
        </p>
        <Button href="/contact" variant="secondary" arrow>
          <T>Get in touch</T>
        </Button>
      </section>
    </>
  );
}

export function ResourcesPage() {
  return (
    <>
      <PageIntro
        eyebrow="THE BUSINESS NOTEBOOK"
        title="Good ideas for your everyday business."
        text="Practical thoughts on stock, sales, money and the small decisions that make a difference."
      />
      <section className="container articles-grid">
        <T>
          {articles.map((a, i) => (
            <Link
              href={`/resources/${a.slug}`}
              className="article-card"
              key={a.slug}
            >
              <div className={`article-art bg-${a.color}`}>
                <span className="article-number">
                  <T>0</T> <T>{i + 1}</T>
                </span>
                <IconBox
                  icon={i === 0 ? BarChart3 : i === 1 ? Package : Users}
                />
                <span>
                  <T>{a.category}</T>
                </span>
              </div>
              <div>
                <span className="eyebrow">
                  <T>{a.category}</T> <T>·</T> <T>{a.read}</T>
                </span>
                <h2>
                  <T>{a.title}</T>
                </h2>
                <p>
                  <T>{a.excerpt}</T>
                </p>
                <span className="text-link">
                  <T>Take a look</T>
                  <ArrowUpRight size={15} />
                </span>
              </div>
            </Link>
          ))}
        </T>
      </section>
      <CTABanner />
    </>
  );
}
export function ArticlePage({ slug }: { slug: string }) {
  const a = articles.find((a) => a.slug === slug)!;
  return (
    <>
      <article className="article-page">
        <Link href="/resources" className="back-link">
          <T>← Back to the notebook</T>
        </Link>
        <Badge tone="green">
          <T>{a.category}</T>
        </Badge>
        <h1>
          <T>{a.title}</T>
        </h1>
        <p className="article-lead">
          <T>{a.excerpt}</T>
        </p>
        <div className="article-meta">
          <BookOpen size={15} />
          <T>{a.read}</T>
          <span>
            <T>BiasharaOS business basics</T>
          </span>
        </div>

        <T>
          {a.sections.map(([title, text]) => (
            <section key={title}>
              <h2>
                <T>{title}</T>
              </h2>
              <p>
                <T>{text}</T>
              </p>
            </section>
          ))}
        </T>

        <div className="article-tip">
          <Sparkles size={23} />
          <div>
            <h3>
              <T>A little practice goes a long way.</T>
            </h3>
            <p>
              <T>
                Put these ideas to work with your own products and customer
                balances in your BiasharaOS workspace.
              </T>
            </p>
            <Button href="/dashboard" size="small" arrow>
              <T>Try the workspace</T>
            </Button>
          </div>
        </div>
      </article>
      <CTABanner />
    </>
  );
}

export function DownloadPage() {
  return (
    <>
      <PageIntro
        eyebrow="GET THE APP"
        title="Your business goes where you go."
        text="Use the web workspace on any screen, or explore the matching Android app."
      />
      <section className="container download-grid">
        <div className="download-card">
          <span className="download-platform">
            <Laptop size={24} />
            <T>THE WEB WORKSPACE</T>
          </span>
          <h2>
            <T>A bigger view</T>
            <br />
            <T>of your business.</T>
          </h2>
          <p>
            <T>
              Open your browser. Find your workspace. Explore sales, stock,
              reports, team tools and more.
            </T>
          </p>
          <div className="download-web-preview">
            <MiniDashboard />
          </div>
          <Button href="/dashboard" arrow>
            <T>Open web workspace</T>
          </Button>
          <span className="quiet-note">
            <T>No installation required. Sign in to your business.</T>
          </span>
        </div>
        <div className="download-card bg-mint">
          <span className="download-platform">
            <Smartphone size={24} />
            <T>ANDROID</T>
          </span>
          <h2>
            <T>Your business,</T>
            <br />
            <T>in your pocket.</T>
          </h2>
          <p>
            <T>
              A familiar workspace for products, sales and customers, designed
              for your phone.
            </T>
          </p>
          <div className="download-phone">
            <Image
              src="/images/app-dashboard.webp"
              alt="BiasharaOS Android application"
              width={393}
              height={852}
            />
          </div>
          <AndroidDownload />
        </div>
      </section>
      <section className="container download-note">
        <ShieldCheck size={22} />
        <div>
          <h3>
            <T>One account, on every screen</T>
          </h3>
          <p>
            <T>
              Your account connects your business on Android and the web. Use
              the same email to access your saved products, customers and business
              records. Google Play and App Store listings are coming soon.
            </T>
          </p>
        </div>
      </section>
    </>
  );
}

export function LegalPage({ type }: { type: "privacy" | "terms" }) {
  const privacy = type === "privacy";
  return (
    <article className="legal-page">
      <span className="eyebrow">
        <T>CLEAR FROM THE BEGINNING</T>
      </span>
      <h1>
        <T>{privacy ? "Privacy, in plain language." : "Early-access terms."}</T>
      </h1>
      <Badge tone="amber">
        <T>Draft · Early access</T>
      </Badge>
      <p className="legal-lead">
        <T>
          {privacy
            ? "This page describes how the early-access service handles account and business information. Final policies must identify the operating business and its retention and deletion arrangements before public launch."
            : "These draft terms describe the early-access service. Final operating, support and commercial terms must be completed before public launch."}
        </T>
      </p>

      <T>
        {(privacy
          ? [
              [
                "What BiasharaOS stores",
                "Your signed-in business records are stored securely and shared across your devices. Account sessions and display preferences may be retained on your device. Sign out on devices you share.",
              ],
              [
                "Account forms",
                "Accounts use your email and password to authenticate. Account details and confirmation or recovery requests are processed by the account service. Passwords are not saved in business records. Never share account links or passwords.",
              ],
              [
                "Messages and requests",
                "Contact inquiries are saved for the business team. Team invitations and purchase orders are saved records; automatic emails and supplier notifications are not sent. The assistant summarizes recorded business activity. External AI and financing are not connected.",
              ],
              [
                "Using the website",
                "We use secure services to operate the website, protect accounts and keep business records. Operational logs may be retained to diagnose problems. We do not add advertising trackers.",
              ],
              [
                "Your controls",
                "Sign out on shared devices and review team access regularly. Clearing browser storage removes local sessions and preferences; it does not delete saved business records. Account deletion and retention arrangements must be finalized before public launch.",
              ],
              [
                "Before launch",
                "A production release will need final policies covering the operating entity, hosting, integrations, retention, account deletion and customer support. This draft should be reviewed and replaced before that release.",
              ],
            ]
          : [
              [
                "An early-access business workspace",
                "BiasharaOS saves the business records you enter. You are responsible for their accuracy and for checking reports against actual stock, receipts and payments. Marketing illustrations show example figures rather than your business data.",
              ],
              [
                "Payments and purchasing",
                "Online payments, automatic supplier orders and financing are not available yet. A recorded payment means a business entered a payment it received; it is not an independent confirmation that money moved.",
              ],
              [
                "Plans and availability",
                "Pricing is proposed launch pricing. Choosing a plan does not create a paid subscription. Lending, online payment collection and external AI are not available yet. Early-access features may change or be interrupted.",
              ],
              [
                "Using your account",
                "Keep your account secure and grant team access only to authorized people. Do not enter bank credentials, card details or identity documents into business notes or contact forms.",
              ],
              [
                "Changes and feedback",
                "The interface and features may change during development. Contact inquiries are saved for follow-up; immediate replies and automated email notifications are not promised.",
              ],
              [
                "Production terms",
                "Before a public launch, final terms must identify the operating entity and define the actual service, support, billing, cancellation and applicable legal arrangements. This page is a starter draft, not those final terms.",
              ],
            ]
        ).map(([title, text]) => (
          <section key={title}>
            <h2>
              <T>{title}</T>
            </h2>
            <p>
              <T>{text}</T>
            </p>
          </section>
        ))}
      </T>

      <Link href="/contact" className="text-link">
        <T>Contact the team</T>
        <ArrowRight size={16} />
      </Link>
    </article>
  );
}
