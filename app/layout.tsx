import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL("https://contextration.arbajsheikh720-0.chatgpt.site"),
  title: "ContextRation — Make context earn its place",
  description: "An open-source, OTel-friendly context efficiency auditor for AI agents.",
  applicationName: "ContextRation",
  keywords: ["AI agents", "context engineering", "OpenTelemetry", "LLM evaluation", "token efficiency"],
  openGraph: {
    title: "ContextRation — Feed your agents only what matters",
    description: "Measure the marginal utility of every context item, validate evidence-scoped token budgets, and export a policy you can defend.",
    type: "website",
    images: [
      {
        url: "/og.png",
        width: 1731,
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
  alternates: { canonical: "/" },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
