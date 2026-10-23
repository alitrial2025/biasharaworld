import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import { ToastProvider } from "@/components/ui";
import "./globals.css";
import "./tools.css";
import { DemoProvider } from "@/lib/store";
import { LocaleProvider } from "@/components/locale";
import { PreferencesBridge } from "@/components/preferences-bridge";

const inter = localFont({
  src: "../../public/fonts/inter.ttf",
  variable: "--font-inter",
  weight: "100 900",
  display: "swap",
});
const manrope = localFont({
  src: "../../public/fonts/manrope.ttf",
  variable: "--font-manrope",
  weight: "200 800",
  display: "swap",
});
export const metadata: Metadata = {
  title: {
    default: "BiasharaOS — Your business. All together.",
    template: "%s | BiasharaOS",
  },
  description:
    "Sell, manage stock, track expenses, find suppliers and understand your business. One simple workspace for everyday entrepreneurs, on the web and Android.",
  applicationName: "BiasharaOS",
  openGraph: {
    title: "BiasharaOS — Your business. All together.",
    description:
      "Smarter tools for the people who keep our neighbourhoods moving.",
    type: "website",
    locale: "en_KE",
  },
  twitter: { card: "summary_large_image" },
};
export const viewport: Viewport = {
  themeColor: "#00815d",
  width: "device-width",
  initialScale: 1,
};
export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${inter.variable} ${manrope.variable}`}>
      <body>
        <a href="#main-content" className="skip-link">
          Skip to content
        </a>
        <DemoProvider>
          <LocaleProvider>
            <PreferencesBridge />
            <ToastProvider>{children}</ToastProvider>
          </LocaleProvider>
        </DemoProvider>
      </body>
    </html>
  );
}
