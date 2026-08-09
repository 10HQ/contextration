import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "ContextRation — Make context earn its place",
  description: "An open-source, OTel-friendly context efficiency auditor for AI agents.",
  applicationName: "ContextRation",
  keywords: ["AI agents", "context engineering", "OpenTelemetry", "LLM evaluation", "token efficiency"],
  openGraph: {
    title: "ContextRation — Feed your agents only what matters",
    description: "Measure the marginal utility of every context item, validate safer token budgets, and export a policy you can defend.",
    type: "website",
    images: [
      {
        url: "/og.png",
        width: 1744,
        height: 909,
        alt: "ContextRation — Make context earn its place",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "ContextRation",
    description: "Make context earn its place.",
    images: ["/og.png"],
  },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body className={`${geistSans.variable} ${geistMono.variable}`}>{children}</body>
    </html>
  );
}
