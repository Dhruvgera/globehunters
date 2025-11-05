import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import SmoothScrolling from "@/components/animations/SmoothScrolling";
import RouteTransitions from "@/components/animations/RouteTransitions";
import { NextIntlClientProvider } from "next-intl";
import { getMessages, defaultLocale } from "@/i18n/config";

const inter = Inter({
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "GlobeHunters - Find Your Perfect Flight",
  description: "Search and compare flights from hundreds of airlines to find the best deals for your next adventure",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const messages = await getMessages(defaultLocale);

  return (
    <html lang={defaultLocale}>
      <body className={`${inter.className} antialiased`}>
        <NextIntlClientProvider locale={defaultLocale} messages={messages}>
          <SmoothScrolling />
          <RouteTransitions>
            {children}
          </RouteTransitions>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
