import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import Header from "@/components/storefront/Header";
import { DebugPanelWrapper } from "@/components/storefront/DebugPanel";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Hot Topic | Apple Pay Demo",
  description:
    "Apple Pay Express Checkout demo for Hot Topic via Fiserv Commerce Hub",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-background text-foreground">
        <Header />
        <main className="flex-1">{children}</main>
        <footer className="border-t border-border py-6 text-center text-sm text-muted">
          <p>Apple Pay Demo &mdash; Fiserv Commerce Hub Sandbox</p>
          <p className="mt-1 text-xs">
            Not affiliated with Hot Topic, Inc. Demo purposes only.
          </p>
        </footer>
        <DebugPanelWrapper />
      </body>
    </html>
  );
}
