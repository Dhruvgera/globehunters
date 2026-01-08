import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import "flag-icons/css/flag-icons.min.css";
import SmoothScrolling from "@/components/animations/SmoothScrolling";
import RouteTransitions from "@/components/animations/RouteTransitions";
import { NextIntlClientProvider } from "next-intl";
import { getMessages, defaultLocale } from "@/i18n/config";
import { AffiliateProvider } from "@/lib/AffiliateContext";

const inter = Inter({
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Find Cheap Flights, Airline Tickets & More | Book Online With Globehunters",
  description: "Find cheap flights, airline tickets, hotels and more with Globehunters with 1000's of holiday destinations to suit any budget.",
  icons: {
    icon: "/image.png",
    shortcut: "/image.png",
    apple: "/image.png",
  },
  openGraph: {
    title: "Cheap Flights, Airline Tickets & More | Book Online With Globehunters",
    description: "Find cheap flights, airline tickets, hotels and more with Globehunters with 1000's of holiday destinations to suit any budget.",
    siteName: "Globehunters",
    type: "website",
    images: ["/image.png"],
  },
  twitter: {
    card: "summary_large_image",
    title: "Cheap Flights, Airline Tickets & More | Book Online With Globehunters",
    description: "Find cheap flights, airline tickets, hotels and more with Globehunters with 1000's of holiday destinations to suit any budget.",
    images: ["/image.png"],
  },
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
          <AffiliateProvider>
            <SmoothScrolling />
            <RouteTransitions>
              {children}
            </RouteTransitions>
          </AffiliateProvider>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
