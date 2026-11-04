import type { Metadata, Viewport } from "next";
import Script from "next/script";
import "./globals.css";
import Providers from "./providers";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import type { ReactNode } from "react";
import { SiteJsonLd } from "@/components/seo/JsonLd";
import SubscribeBottomBar from "@/components/features/SubscribeBottomBar";
import StateRequiredBanner from "@/components/features/StateRequiredBanner";
import { isEmailConfigured } from "@/lib/config";

// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// Metadata
// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export const metadata: Metadata = {
  title: {
    default: "KnowYourGov â€” Your Government, In Plain English",
    template: "%s | KnowYourGov",
  },
  description:
    "Understand your government without the jargon. Track Congress, Supreme Court rulings, " +
    "federal agency budgets, campaign finance, and your local ballot â€” all in plain English.",
  keywords: [
    "government",
    "congress",
    "supreme court",
    "federal agencies",
    "legislation",
    "elections",
    "nonpartisan",
    "civic information",
    "campaign finance",
    "voter information",
    "judicial branch",
    "SCOTUS",
  ],
  authors: [{ name: "KnowYourGov" }],
  creator: "KnowYourGov",
  publisher: "KnowYourGov",
  metadataBase: new URL("https://knowyourgov.us"),
  alternates: { canonical: "/" },
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true },
  },
  openGraph: {
    type: "website",
    locale: "en_US",
    url: "https://knowyourgov.us",
    siteName: "KnowYourGov",
    title: "KnowYourGov â€” Your Government, In Plain English",
    description:
      "Track Congress, the Supreme Court, federal agencies, and your ballot. " +
      "Complex government made simple â€” nonpartisan, no spin.",
  },
  twitter: {
    card: "summary_large_image",
    title: "KnowYourGov â€” Your Government, In Plain English",
    description:
      "Congress, SCOTUS, federal agencies, and your ballot â€” all explained in plain English.",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#1B2A4A",
};

// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// Root Layout
// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

interface RootLayoutProps {
  children: ReactNode;
}

export default function RootLayout({ children }: RootLayoutProps) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <SiteJsonLd />
      </head>
      <body className="min-h-screen flex flex-col bg-gray-50 text-gray-800 antialiased">
        <Providers>
          {/* Skip-to-main-content for accessibility */}
          <a
            href="#main-content"
            className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-50
                       focus:px-4 focus:py-2 focus:bg-white focus:text-[#1B2A4A] focus:font-semibold
                       focus:rounded focus:shadow-lg focus:outline-none"
          >
            Skip to main content
          </a>

          <Header />
          <StateRequiredBanner />

          <main
            id="main-content"
            className="flex-1 w-full"
            role="main"
          >
            {children}
          </main>

          <Footer />
          {isEmailConfigured() && <SubscribeBottomBar />}
        </Providers>
        {process.env.NEXT_PUBLIC_UMAMI_SCRIPT_URL &&
          process.env.NEXT_PUBLIC_UMAMI_WEBSITE_ID && (
            <Script
              src={process.env.NEXT_PUBLIC_UMAMI_SCRIPT_URL}
              data-website-id={process.env.NEXT_PUBLIC_UMAMI_WEBSITE_ID}
              strategy="afterInteractive"
            />
          )}
      </body>
    </html>
  );
}
