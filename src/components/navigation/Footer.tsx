import Link from "next/link";
import Image from "next/image";
import { Shield, CreditCard } from "lucide-react";

export default function Footer() {
  const destinations = [
    { name: "Abu Dhabi", href: "/flights/abu-dhabi" },
    { name: "Adelaide", href: "/flights/adelaide" },
    { name: "Auckland", href: "/flights/auckland" },
    { name: "Atlanta", href: "/flights/atlanta" },
    { name: "Bali", href: "/flights/bali" },
    { name: "Bangkok", href: "/flights/bangkok" },
    { name: "Basilan", href: "/flights/basilan" },
    { name: "Brisbane", href: "/flights/brisbane" },
    { name: "Cape Town", href: "/flights/cape-town" },
    { name: "Chicago", href: "/flights/chicago" },
    { name: "Cebu Business Class", href: "/flights/cebu-business" },
    { name: "Cebu First Class", href: "/flights/cebu-first" },
    { name: "Delhi", href: "/flights/delhi" },
    { name: "Denver", href: "/flights/denver" },
    { name: "Detroit", href: "/flights/detroit" },
    { name: "Dubai", href: "/flights/dubai" },
    { name: "Fort Lauderdale", href: "/flights/fort-lauderdale" },
    { name: "Hawaii", href: "/flights/hawaii" },
    { name: "Hong Kong", href: "/flights/hong-kong" },
    { name: "Islamabad", href: "/flights/islamabad" },
    { name: "Las Vegas", href: "/flights/las-vegas" },
    { name: "Lima", href: "/flights/lima" },
    { name: "Los Angeles", href: "/flights/los-angeles" },
    { name: "Manila", href: "/flights/manila" },
    { name: "Melbourne", href: "/flights/melbourne" },
    { name: "Miami", href: "/flights/miami" },
    { name: "Nairobi", href: "/flights/nairobi" },
    { name: "New York", href: "/flights/new-york" },
    { name: "Orlando", href: "/flights/orlando" },
    { name: "Perth", href: "/flights/perth" },
    { name: "Phuket", href: "/flights/phuket" },
    { name: "Rio De Janeiro", href: "/flights/rio-de-janeiro" },
    { name: "San Francisco", href: "/flights/san-francisco" },
    { name: "Sao Paulo", href: "/flights/sao-paulo" },
    { name: "Sydney", href: "/flights/sydney" },
    { name: "Taiwan", href: "/flights/taiwan" },
    { name: "Toronto", href: "/flights/toronto" },
    { name: "Washington", href: "/flights/washington" },
  ];

  const footerLinks = [
    { name: "About Us", href: "/about" },
    { name: "Site Map", href: "/sitemap" },
    { name: "Terms & Conditions", href: "/terms" },
    { name: "Contact Us", href: "/contact" },
    { name: "Cookie Policy", href: "/cookies" },
    { name: "Blog", href: "/blog" },
    { name: "Privacy Policy", href: "/privacy" },
  ];

  return (
    <footer className="bg-[#F8F9FA] border-t border-[#DFE0E4] mt-20">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-12">
        {/* Trust Badges Section */}
        <div className="flex flex-wrap items-center justify-center gap-6 mb-12 pb-8 border-b border-[#DFE0E4]">
          <Image
            src="/iata.svg"
            alt="IATA"
            width={80}
            height={40}
            className="h-10 w-auto opacity-90 hover:opacity-100 transition-opacity"
          />
          <Image
            src="/atol.svg"
            alt="ATOL Protected"
            width={80}
            height={40}
            className="h-10 w-auto opacity-90 hover:opacity-100 transition-opacity"
          />
          <Image
            src="/trustwave.svg"
            alt="Trustwave"
            width={80}
            height={40}
            className="h-10 w-auto opacity-90 hover:opacity-100 transition-opacity"
          />
        </div>

        {/* Regional Sites */}
        <div className="mb-10 pb-8 border-b border-[#DFE0E4]">
          <h3 className="text-sm font-semibold text-[#3A478A] mb-4 text-center">
            GlobeHunters Regional Sites
          </h3>
          <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-sm">
            <Link href="https://globehunters.com.au" className="text-[#3A478A] hover:text-[#010D50] transition-colors">
              Globehunters.com.au
            </Link>
            <Link href="https://globehunters.co.uk" className="text-[#3A478A] hover:text-[#010D50] transition-colors">
              Globehunters.co.uk
            </Link>
            <Link href="https://globehunters.co.nz" className="text-[#3A478A] hover:text-[#010D50] transition-colors">
              Globehunters.co.nz
            </Link>
            <Link href="https://globehunters.com" className="text-[#3A478A] hover:text-[#010D50] transition-colors">
              Globehunters.com
            </Link>
            <Link href="https://globehunters.ie" className="text-[#3A478A] hover:text-[#010D50] transition-colors">
              Globehunters.ie
            </Link>
            <Link href="https://globehunters.ca" className="text-[#3A478A] hover:text-[#010D50] transition-colors">
              Globehunters.ca
            </Link>
            <Link href="https://globehunters.in" className="text-[#3A478A] hover:text-[#010D50] transition-colors">
              Globehunters.in
            </Link>
            <Link href="https://globehunters.ae" className="text-[#3A478A] hover:text-[#010D50] transition-colors">
              Globehunters.ae
            </Link>
          </div>
        </div>

        {/* Popular Destinations */}
        <div className="mb-10 pb-8 border-b border-[#DFE0E4]">
          <h3 className="text-lg font-semibold text-[#010D50] mb-6">
            Popular Globehunters Destinations
          </h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-x-4 gap-y-2 text-sm">
            {destinations.map((destination) => (
              <Link
                key={destination.name}
                href={destination.href}
                className="text-[#3A478A] hover:text-[#010D50] transition-colors"
              >
                {destination.name}
              </Link>
            ))}
          </div>
        </div>

        {/* Security & Payment Section */}
        <div className="grid md:grid-cols-2 gap-8 mb-10 pb-8 border-b border-[#DFE0E4]">
          {/* Secure Booking */}
          <div>
            <div className="flex items-center gap-2 mb-4">
              <div className="w-10 h-10 rounded-full bg-[rgba(55,84,237,0.2)] flex items-center justify-center">
                <Shield className="w-5 h-5 text-[#3754ED]" />
              </div>
              <h3 className="text-lg font-semibold text-[#010D50]">Secure Online Booking</h3>
            </div>
            <div className="flex items-center gap-2">
              <Image
                src="/sysnet.svg"
                alt="Sysnet Secure"
                width={80}
                height={40}
                className="h-10 w-auto opacity-90"
              />
            </div>
          </div>

          {/* Payment Methods */}
          <div>
            <div className="flex items-center gap-2 mb-4">
              <div className="w-10 h-10 rounded-full bg-[rgba(55,84,237,0.2)] flex items-center justify-center">
                <CreditCard className="w-5 h-5 text-[#3754ED]" />
              </div>
              <h3 className="text-lg font-semibold text-[#010D50]">Cards We Accept</h3>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <Image src="/visa.svg" alt="Visa" width={50} height={32} className="h-8 w-auto opacity-90" />
              <Image src="/mastercard.svg" alt="Mastercard" width={50} height={32} className="h-8 w-auto opacity-90" />
              <Image src="/amex.svg" alt="American Express" width={50} height={32} className="h-8 w-auto opacity-90" />
              <Image src="/maestro.svg" alt="Maestro" width={50} height={32} className="h-8 w-auto opacity-90" />
              <Image src="/discover.svg" alt="Discover" width={50} height={32} className="h-8 w-auto opacity-90" />
              <Image src="/jcb.svg" alt="JCB" width={50} height={32} className="h-8 w-auto opacity-90" />
            </div>
          </div>
        </div>

        {/* Footer Links */}
        <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-sm mb-8">
          {footerLinks.map((link, index) => (
            <span key={link.name} className="flex items-center gap-2">
              <Link href={link.href} className="text-[#3A478A] hover:text-[#010D50] transition-colors">
                {link.name}
              </Link>
              {index < footerLinks.length - 1 && (
                <span className="text-[#DFE0E4]">|</span>
              )}
            </span>
          ))}
        </div>

        {/* Copyright */}
        <div className="text-center text-sm text-[#3A478A]">
          <p className="mb-2">
            © Copyright 2025 - GlobeHunters | GlobeHunters is a trading name of A1 Travel Deals Limited, 
            registered in England No. W0981096
          </p>
          <p className="text-xs leading-relaxed max-w-5xl mx-auto">
            For the latest travel advice and information, including entry requirements and travel restrictions, 
            please visit the official government website. Email: service@globehunters.co.uk
          </p>
        </div>
      </div>
    </footer>
  );
}
