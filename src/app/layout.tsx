import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import SmoothScrolling from "@/components/SmoothScrolling";
import RouteTransitions from "@/components/RouteTransitions";

const inter = Inter({
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "GlobeHunters - Find Your Perfect Flight",
  description: "Search and compare flights from hundreds of airlines to find the best deals for your next adventure",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${inter.className} antialiased`}>
        <SmoothScrolling />
        <RouteTransitions>
          {children}
        </RouteTransitions>
      </body>
    </html>
  );
}
