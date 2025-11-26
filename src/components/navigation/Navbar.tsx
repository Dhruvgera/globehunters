"use client";

import Link from "next/link";
import Image from "next/image";
import { useState } from "react";
import { Phone, Menu, X } from "lucide-react";
import { useTranslations } from "next-intl";
import { useAffiliatePhone } from "@/lib/AffiliateContext";

export default function Navbar() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const t = useTranslations('common.navigation');
  const { phoneNumber } = useAffiliatePhone();

  return (
    <nav className="w-full border-b bg-white sticky top-0 z-50 overflow-x-clip">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-4">
        <div className="flex items-center justify-between">
          {/* Logo and Navigation */}
          <div className="flex items-center gap-6 sm:gap-10 lg:gap-16">
            {/* Logo */}
            <Link href="/" className="flex items-center" aria-label="GlobeHunters home">
              <Image src="/gh-logo.svg" alt={t('logoAlt')} width={180} height={35} priority />
            </Link>

            {/* Awards and Certifications */}
            <div className="hidden md:flex items-center gap-6 lg:gap-8">
              <div className="flex items-center gap-2">
                {/* <span className="text-[#010D50] text-xs font-medium">
                  {t('awards')}
                </span> */}
                <Image
                  src="/ba.png"
                  alt={t('awards')}
                  width={176}
                  height={100}
                />
              </div>
              <div className="flex items-center gap-2">
                <Image
                  src="/atol.png"
                  alt={t('atolAlt')}
                  width={68}
                  height={32}
                />
              </div>
              <div className="flex items-center gap-2">
                <Image
                  src="/iata.svg"
                  alt={t('iataAlt')}
                  width={56}
                  height={32}
                />
              </div>
            </div>
          </div>

          {/* Phone Number */}
          <div className="flex items-center gap-3">
            <a
              href={`tel:${phoneNumber.replace(/\s/g, '')}`}
              className="hidden sm:flex items-center gap-2 bg-[rgba(55,84,237,0.12)] rounded-[40px] px-4 py-2"
            >
              <div className="w-9 h-9 rounded-full bg-[#0B229E] flex items-center justify-center">
                <Phone className="w-5 h-5 text-white" />
              </div>
              <div className="flex flex-col">
                <span className="text-[#010D50] text-[8px] font-medium leading-tight">
                  {t('phone.label')}
                </span>
                <span className="text-[#010D50] text-sm font-bold">
                  {phoneNumber}
                </span>
              </div>
            </a>

            {/* Mobile actions */}
            <div className="flex items-center md:hidden gap-2">
              <a
                href={`tel:${phoneNumber.replace(/\s/g, '')}`}
                aria-label={t('phone.ariaLabel')}
                className="w-9 h-9 rounded-full bg-[#0B229E] flex items-center justify-center"
              >
                <Phone className="w-5 h-5 text-white" />
              </a>
              <button
                type="button"
                aria-label={t('menu.toggleAriaLabel')}
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
          <div className="md:hidden mt-4 border-t pt-4">
            <div className="flex flex-col gap-4 pb-2">
              <div className="text-[#010D50] text-sm font-medium leading-relaxed">
                {t('awards')}
              </div>
              <div className="flex items-center gap-4 flex-wrap">
                <div className="flex items-center">
                  <Image
                    src="/atol-logo-58963.png"
                    alt={t('atolAlt')}
                    width={68}
                    height={32}
                    className="h-8 w-auto"
                  />
                </div>
                <div className="flex items-center">
                  <Image
                    src="/iata.svg"
                    alt={t('iataAlt')}
                    width={56}
                    height={32}
                    className="h-8 w-auto"
                  />
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </nav>
  );
}

