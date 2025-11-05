"use client";

import Navbar from "@/components/navigation/Navbar";
import Footer from "@/components/navigation/Footer";
import SearchBar from "@/components/search/SearchBar";
import { Plane } from "lucide-react";
import { useTranslations } from "next-intl";

export default function Home() {
  const t = useTranslations('home');
  
  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white">
      <Navbar />
      
      {/* Hero Section */}
      <main className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 xl:px-12 py-12 sm:py-16 lg:py-20">
        <div className="text-center mb-10 sm:mb-12">
          <div className="flex items-center justify-center gap-3 mb-4 sm:mb-6">
            <Plane className="w-10 h-10 sm:w-12 sm:h-12 text-[#3754ED]" />
            <h1 className="text-3xl sm:text-5xl lg:text-6xl font-bold text-[#010D50]">
              {t('hero.title')}
            </h1>
          </div>
          <p className="text-base sm:text-lg lg:text-xl text-[#3A478A] max-w-2xl mx-auto">
            {t('hero.subtitle')}
          </p>
        </div>

        {/* Search Bar */}
        <div className="mb-10 sm:mb-16">
          <SearchBar />
        </div>

        {/* Features */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-8 mt-12 lg:mt-20">
          <div className="bg-white p-6 lg:p-8 rounded-2xl shadow-md border border-[#DFE0E4]">
            <div className="w-16 h-16 bg-[rgba(55,84,237,0.12)] rounded-full flex items-center justify-center mb-4">
              <svg className="w-8 h-8 text-[#3754ED]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h3 className="text-xl font-semibold text-[#010D50] mb-2">{t('features.bestPrice.title')}</h3>
            <p className="text-[#3A478A]">
              {t('features.bestPrice.description')}
            </p>
          </div>

          <div className="bg-white p-6 lg:p-8 rounded-2xl shadow-md border border-[#DFE0E4]">
            <div className="w-16 h-16 bg-[rgba(55,84,237,0.12)] rounded-full flex items-center justify-center mb-4">
              <svg className="w-8 h-8 text-[#3754ED]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
            </div>
            <h3 className="text-xl font-semibold text-[#010D50] mb-2">{t('features.secureBooking.title')}</h3>
            <p className="text-[#3A478A]">
              {t('features.secureBooking.description')}
            </p>
          </div>

          <div className="bg-white p-6 lg:p-8 rounded-2xl shadow-md border border-[#DFE0E4]">
            <div className="w-16 h-16 bg-[rgba(55,84,237,0.12)] rounded-full flex items-center justify-center mb-4">
              <svg className="w-8 h-8 text-[#3754ED]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 5.636l-3.536 3.536m0 5.656l3.536 3.536M9.172 9.172L5.636 5.636m3.536 9.192l-3.536 3.536M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-5 0a4 4 0 11-8 0 4 4 0 018 0z" />
              </svg>
            </div>
            <h3 className="text-xl font-semibold text-[#010D50] mb-2">{t('features.support.title')}</h3>
            <p className="text-[#3A478A]">
              {t('features.support.description')}
            </p>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
