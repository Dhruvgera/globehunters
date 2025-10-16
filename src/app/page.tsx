import Navbar from "@/components/Navbar";
import SearchBar from "@/components/SearchBar";
import { Plane } from "lucide-react";

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white">
      <Navbar />
      
      {/* Hero Section */}
      <main className="mx-auto max-w-[1564px] px-[178px] py-20">
        <div className="text-center mb-12">
          <div className="flex items-center justify-center gap-3 mb-6">
            <Plane className="w-12 h-12 text-[#3754ED]" />
            <h1 className="text-6xl font-bold text-[#010D50]">
              Find Your Perfect Flight
            </h1>
          </div>
          <p className="text-xl text-[#3A478A] max-w-2xl mx-auto">
            Search and compare flights from hundreds of airlines to find the best deals for your next adventure
          </p>
        </div>

        {/* Search Bar */}
        <div className="mb-16">
          <SearchBar />
        </div>

        {/* Features */}
        <div className="grid grid-cols-3 gap-8 mt-20">
          <div className="bg-white p-8 rounded-2xl shadow-md border border-[#DFE0E4]">
            <div className="w-16 h-16 bg-[rgba(55,84,237,0.12)] rounded-full flex items-center justify-center mb-4">
              <svg className="w-8 h-8 text-[#3754ED]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h3 className="text-xl font-semibold text-[#010D50] mb-2">Best Price Guarantee</h3>
            <p className="text-[#3A478A]">
              We compare prices from hundreds of airlines to ensure you get the best deal available
            </p>
          </div>

          <div className="bg-white p-8 rounded-2xl shadow-md border border-[#DFE0E4]">
            <div className="w-16 h-16 bg-[rgba(55,84,237,0.12)] rounded-full flex items-center justify-center mb-4">
              <svg className="w-8 h-8 text-[#3754ED]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
            </div>
            <h3 className="text-xl font-semibold text-[#010D50] mb-2">Secure Booking</h3>
            <p className="text-[#3A478A]">
              Your payment information is encrypted and secure with our advanced security protocols
            </p>
          </div>

          <div className="bg-white p-8 rounded-2xl shadow-md border border-[#DFE0E4]">
            <div className="w-16 h-16 bg-[rgba(55,84,237,0.12)] rounded-full flex items-center justify-center mb-4">
              <svg className="w-8 h-8 text-[#3754ED]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 5.636l-3.536 3.536m0 5.656l3.536 3.536M9.172 9.172L5.636 5.636m3.536 9.192l-3.536 3.536M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-5 0a4 4 0 11-8 0 4 4 0 018 0z" />
              </svg>
            </div>
            <h3 className="text-xl font-semibold text-[#010D50] mb-2">24/7 Support</h3>
            <p className="text-[#3A478A]">
              Our dedicated support team is available round the clock to assist you with any queries
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}
