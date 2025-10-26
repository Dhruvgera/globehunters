"use client";

import Link from "next/link";
import Image from "next/image";
import { useState } from "react";
import { Phone, Menu, X } from "lucide-react";

export default function Navbar() {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <nav className="w-full border-b bg-white sticky top-0 z-50 overflow-x-clip">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-4">
        <div className="flex items-center justify-between">
          {/* Logo and Navigation */}
          <div className="flex items-center gap-6 sm:gap-10 lg:gap-16">
            {/* Logo */}
            <Link href="/" className="flex items-center" aria-label="GlobeHunters home">
              <Image src="/gh-logo.svg" alt="GlobeHunters" width={144} height={28} priority />
            </Link>

            {/* Navigation Links */}
            <div className="hidden md:flex items-center gap-6 lg:gap-8">
              <Link
                href="/"
                className="text-[#010D50] text-sm font-medium hover:text-[#3754ED] transition-colors uppercase tracking-wide"
              >
                Home
              </Link>
              <Link
                href="/contact"
                className="text-[#010D50] text-sm font-medium hover:text-[#3754ED] transition-colors uppercase tracking-wide"
              >
                Contact Us
              </Link>
              <Link
                href="/offers"
                className="text-[#010D50] text-sm font-medium hover:text-[#3754ED] transition-colors uppercase tracking-wide"
              >
                Special Offer
              </Link>
            </div>
          </div>

          {/* Phone Number */}
          <div className="flex items-center gap-3">
            <a
              href="tel:02045022984"
              className="hidden sm:flex items-center gap-2 bg-[rgba(55,84,237,0.12)] rounded-[40px] px-4 py-2"
            >
              <div className="w-9 h-9 rounded-full bg-[#0B229E] flex items-center justify-center">
                <Phone className="w-5 h-5 text-white" />
              </div>
              <div className="flex flex-col">
                <span className="text-[#010D50] text-[8px] font-medium leading-tight">
                  24/7 Toll-Free
                </span>
                <span className="text-[#010D50] text-sm font-bold">
                  020 4502 2984
                </span>
              </div>
            </a>

            {/* Mobile actions */}
            <div className="flex items-center md:hidden gap-2">
              <a
                href="tel:02045022984"
                aria-label="Call GlobeHunters"
                className="w-9 h-9 rounded-full bg-[#0B229E] flex items-center justify-center"
              >
                <Phone className="w-5 h-5 text-white" />
              </a>
              <button
                type="button"
                aria-label="Toggle menu"
                aria-expanded={mobileOpen}
                onClick={() => setMobileOpen((v) => !v)}
                className="w-9 h-9 rounded-full border border-gray-200 flex items-center justify-center text-[#010D50]"
              >
                {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
              </button>
            </div>
          </div>
        </div>

        {/* Mobile Menu */}
        {mobileOpen && (
          <div className="md:hidden mt-4 border-t pt-3">
            <div className="flex flex-col gap-3">
              <Link
                href="/"
                className="text-[#010D50] text-sm font-medium hover:text-[#3754ED] transition-colors uppercase tracking-wide"
                onClick={() => setMobileOpen(false)}
              >
                Home
              </Link>
              <Link
                href="/contact"
                className="text-[#010D50] text-sm font-medium hover:text-[#3754ED] transition-colors uppercase tracking-wide"
                onClick={() => setMobileOpen(false)}
              >
                Contact Us
              </Link>
              <Link
                href="/offers"
                className="text-[#010D50] text-sm font-medium hover:text-[#3754ED] transition-colors uppercase tracking-wide"
                onClick={() => setMobileOpen(false)}
              >
                Special Offer
              </Link>
            </div>
          </div>
        )}
      </div>
    </nav>
  );
}

