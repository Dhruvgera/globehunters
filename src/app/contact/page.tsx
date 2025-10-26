import Navbar from "@/components/navigation/Navbar";
import { Phone, Mail, MapPin } from "lucide-react";

export default function ContactPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white">
      <Navbar />
      
      <main className="mx-auto max-w-[1564px] px-[178px] py-20">
        <div className="text-center mb-12">
          <h1 className="text-5xl font-bold text-[#010D50] mb-4">
            Contact Us
          </h1>
          <p className="text-xl text-[#3A478A]">
            We&apos;re here to help you plan your perfect journey
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-12">
          <div className="bg-white p-8 rounded-2xl shadow-md border border-[#DFE0E4] text-center">
            <div className="w-16 h-16 bg-[rgba(55,84,237,0.12)] rounded-full flex items-center justify-center mb-4 mx-auto">
              <Phone className="w-8 h-8 text-[#3754ED]" />
            </div>
            <h3 className="text-xl font-semibold text-[#010D50] mb-2">Phone</h3>
            <p className="text-[#3A478A] mb-2">24/7 Toll-Free</p>
            <p className="text-lg font-semibold text-[#3754ED]">020 4502 2984</p>
          </div>

          <div className="bg-white p-8 rounded-2xl shadow-md border border-[#DFE0E4] text-center">
            <div className="w-16 h-16 bg-[rgba(55,84,237,0.12)] rounded-full flex items-center justify-center mb-4 mx-auto">
              <Mail className="w-8 h-8 text-[#3754ED]" />
            </div>
            <h3 className="text-xl font-semibold text-[#010D50] mb-2">Email</h3>
            <p className="text-[#3A478A] mb-2">Send us a message</p>
            <p className="text-lg font-semibold text-[#3754ED]">info@globehunters.com</p>
          </div>

          <div className="bg-white p-8 rounded-2xl shadow-md border border-[#DFE0E4] text-center">
            <div className="w-16 h-16 bg-[rgba(55,84,237,0.12)] rounded-full flex items-center justify-center mb-4 mx-auto">
              <MapPin className="w-8 h-8 text-[#3754ED]" />
            </div>
            <h3 className="text-xl font-semibold text-[#010D50] mb-2">Office</h3>
            <p className="text-[#3A478A] mb-2">Visit us</p>
            <p className="text-lg font-semibold text-[#3754ED]">London, UK</p>
          </div>
        </div>

        <div className="bg-white p-12 rounded-2xl shadow-md border border-[#DFE0E4]">
          <h2 className="text-3xl font-bold text-[#010D50] mb-8 text-center">
            Send us a Message
          </h2>
          <form className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-[#010D50] mb-2">
                  First Name
                </label>
                <input
                  type="text"
                  className="w-full px-4 py-3 border border-[#DFE0E4] rounded-lg focus:ring-2 focus:ring-[#3754ED] focus:border-transparent outline-none"
                  placeholder="John"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-[#010D50] mb-2">
                  Last Name
                </label>
                <input
                  type="text"
                  className="w-full px-4 py-3 border border-[#DFE0E4] rounded-lg focus:ring-2 focus:ring-[#3754ED] focus:border-transparent outline-none"
                  placeholder="Doe"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-[#010D50] mb-2">
                Email
              </label>
              <input
                type="email"
                className="w-full px-4 py-3 border border-[#DFE0E4] rounded-lg focus:ring-2 focus:ring-[#3754ED] focus:border-transparent outline-none"
                placeholder="john.doe@example.com"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-[#010D50] mb-2">
                Message
              </label>
              <textarea
                rows={6}
                className="w-full px-4 py-3 border border-[#DFE0E4] rounded-lg focus:ring-2 focus:ring-[#3754ED] focus:border-transparent outline-none resize-none"
                placeholder="How can we help you?"
              />
            </div>

            <button
              type="submit"
              className="w-full bg-[#3754ED] hover:bg-[#2A3FB8] text-white font-semibold py-4 rounded-lg transition-colors"
            >
              Send Message
            </button>
          </form>
        </div>
      </main>
    </div>
  );
}

