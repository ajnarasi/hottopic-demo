import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import Header from "@/components/storefront/Header";
import ApiTracePanel from "@/components/storefront/ApiTracePanel";

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
      <body className="h-full flex flex-col bg-background text-foreground">
        <Header />
        <div className="flex-1 flex min-h-0">
          <main className="flex-1 overflow-y-auto">{children}</main>
          <ApiTracePanel />
        </div>
        <footer className="border-t border-border py-4 text-center text-sm text-muted shrink-0">
          <p>Apple Pay Demo &mdash; Fiserv Commerce Hub Sandbox</p>
          <p className="mt-1 text-xs">
            Not affiliated with Hot Topic, Inc. Demo purposes only.
          </p>
        </footer>
      </body>
    </html>
  );
}
