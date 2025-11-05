"use client";

import Navbar from "@/components/navigation/Navbar";
import Footer from "@/components/navigation/Footer";
import { Phone, Mail, MapPin } from "lucide-react";
import { useTranslations } from "next-intl";

export default function ContactPage() {
  const t = useTranslations('contact');
  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white">
      <Navbar />
      
      <main className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 xl:px-12 py-12 sm:py-16 lg:py-20">
        <div className="text-center mb-10 sm:mb-12">
          <h1 className="text-3xl sm:text-5xl font-bold text-[#010D50] mb-4">
            {t('title')}
          </h1>
          <p className="text-base sm:text-lg lg:text-xl text-[#3A478A]">
            {t('subtitle')}
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-12">
          <div className="bg-white p-8 rounded-2xl shadow-md border border-[#DFE0E4] text-center">
            <div className="w-16 h-16 bg-[rgba(55,84,237,0.12)] rounded-full flex items-center justify-center mb-4 mx-auto">
              <Phone className="w-8 h-8 text-[#3754ED]" />
            </div>
            <h3 className="text-xl font-semibold text-[#010D50] mb-2">{t('phone.title')}</h3>
            <p className="text-[#3A478A] mb-2">{t('phone.subtitle')}</p>
            <p className="text-lg font-semibold text-[#3754ED]">{t('phone.number')}</p>
          </div>

          <div className="bg-white p-8 rounded-2xl shadow-md border border-[#DFE0E4] text-center">
            <div className="w-16 h-16 bg-[rgba(55,84,237,0.12)] rounded-full flex items-center justify-center mb-4 mx-auto">
              <Mail className="w-8 h-8 text-[#3754ED]" />
            </div>
            <h3 className="text-xl font-semibold text-[#010D50] mb-2">{t('email.title')}</h3>
            <p className="text-[#3A478A] mb-2">{t('email.subtitle')}</p>
            <p className="text-lg font-semibold text-[#3754ED]">{t('email.address')}</p>
          </div>

          <div className="bg-white p-8 rounded-2xl shadow-md border border-[#DFE0E4] text-center">
            <div className="w-16 h-16 bg-[rgba(55,84,237,0.12)] rounded-full flex items-center justify-center mb-4 mx-auto">
              <MapPin className="w-8 h-8 text-[#3754ED]" />
            </div>
            <h3 className="text-xl font-semibold text-[#010D50] mb-2">{t('office.title')}</h3>
            <p className="text-[#3A478A] mb-2">{t('office.subtitle')}</p>
            <p className="text-lg font-semibold text-[#3754ED]">{t('office.location')}</p>
          </div>
        </div>

        <div className="bg-white p-12 rounded-2xl shadow-md border border-[#DFE0E4]">
          <h2 className="text-3xl font-bold text-[#010D50] mb-8 text-center">
            {t('form.title')}
          </h2>
          <form className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-[#010D50] mb-2">
                  {t('form.firstName')}
                </label>
                <input
                  type="text"
                  className="w-full px-4 py-3 border border-[#DFE0E4] rounded-lg focus:ring-2 focus:ring-[#3754ED] focus:border-transparent outline-none"
                  placeholder={t('form.firstNamePlaceholder')}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-[#010D50] mb-2">
                  {t('form.lastName')}
                </label>
                <input
                  type="text"
                  className="w-full px-4 py-3 border border-[#DFE0E4] rounded-lg focus:ring-2 focus:ring-[#3754ED] focus:border-transparent outline-none"
                  placeholder={t('form.lastNamePlaceholder')}
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-[#010D50] mb-2">
                {t('form.email')}
              </label>
              <input
                type="email"
                className="w-full px-4 py-3 border border-[#DFE0E4] rounded-lg focus:ring-2 focus:ring-[#3754ED] focus:border-transparent outline-none"
                placeholder={t('form.emailPlaceholder')}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-[#010D50] mb-2">
                {t('form.message')}
              </label>
              <textarea
                rows={6}
                className="w-full px-4 py-3 border border-[#DFE0E4] rounded-lg focus:ring-2 focus:ring-[#3754ED] focus:border-transparent outline-none resize-none"
                placeholder={t('form.messagePlaceholder')}
              />
            </div>

            <button
              type="submit"
              className="w-full bg-[#3754ED] hover:bg-[#2A3FB8] text-white font-semibold py-4 rounded-lg transition-colors"
            >
              {t('form.send')}
            </button>
          </form>
        </div>
      </main>

      <Footer />
    </div>
  );
}

