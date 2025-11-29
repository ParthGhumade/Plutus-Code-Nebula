import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { AppShell } from "@/components/AppShell";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Plutus",
  description: "AI-Powered Financial Agent - Smart Investment Decisions",
  icons: {
    icon: "/icon1.jpg",
    shortcut: "/icon1.jpg",
    apple: "/icon1.jpg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <link rel="icon" href="/icon1.jpg" type="image/jpeg" />
        <link rel="apple-touch-icon" href="/icon1.jpg" />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <AppShell>
          {children}
        </AppShell>
      </body>
    </html>
  );
}
