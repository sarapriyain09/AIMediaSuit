import type { Metadata } from "next";
import { Plus_Jakarta_Sans, Space_Grotesk } from "next/font/google";
import { AppProviders } from "@/components/layout/app-providers";
import "./globals.css";

const manrope = Plus_Jakarta_Sans({
  variable: "--font-manrope",
  subsets: ["latin"],
  display: "swap",
});

const sora = Space_Grotesk({
  variable: "--font-sora",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "AI Media Suite",
  description: "Voice Studio MVP for Velynxia Growth Platform",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${manrope.variable} ${sora.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col">
        <AppProviders>{children}</AppProviders>
      </body>
    </html>
  );
}
