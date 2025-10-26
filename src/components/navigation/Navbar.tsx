import Link from "next/link";
import Image from "next/image";
import { Phone } from "lucide-react";

export default function Navbar() {
  return (
    <nav className="w-full border-b bg-white">
      <div className="mx-auto max-w-7xl px-8 py-4">
        <div className="flex items-center justify-between">
          {/* Logo and Navigation */}
          <div className="flex items-center gap-16">
            {/* Logo */}
            <Link href="/" className="flex items-center" aria-label="GlobeHunters home">
              <Image src="/gh-logo.svg" alt="GlobeHunters" width={144} height={28} priority />
            </Link>

            {/* Navigation Links */}
            <div className="flex items-center gap-8">
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
          <div className="flex items-center gap-2 bg-[rgba(55,84,237,0.12)] rounded-[40px] px-4 py-2">
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
          </div>
        </div>
      </div>
    </nav>
  );
}

