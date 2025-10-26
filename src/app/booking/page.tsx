"use client";

import { Suspense, useState } from "react";
import { useRouter } from "next/navigation";
import Navbar from "@/components/navigation/Navbar";
import { ChevronLeft, Info, Phone, Plane, Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import Link from "next/link";
import UpgradeOptionsModal from "@/components/flights/modals/UpgradeOptionsModal";

function BookingContent() {
  const router = useRouter();
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  return (
    <div className="min-h-screen bg-white">
      <Navbar />

      {/* Main Content */}
      <div className="mx-auto max-w-7xl px-8 py-4">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          {/* Back Button */}
          <Link
            href="/search"
            className="flex items-center gap-2 text-sm font-medium text-[#010D50] hover:text-[#3754ED] transition-colors w-fit"
          >
            <ChevronLeft className="w-4 h-4" />
            Back to search results
          </Link>

          {/* Progress Steps */}
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1.5">
              <div className="w-5 h-5 rounded-full border border-[#010D50] flex items-center justify-center">
                <span className="text-[10px] font-medium text-[#010D50]">1</span>
              </div>
              <span className="text-xs font-medium text-[#010D50]">
                Your details
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-5 h-5 rounded-full border border-[#010D50] flex items-center justify-center">
                <span className="text-[10px] font-medium text-[#010D50]">2</span>
              </div>
              <span className="text-xs font-medium text-[#010D50]">
                Choose your fair
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-5 h-5 rounded-full border border-[#010D50] flex items-center justify-center">
                <span className="text-[10px] font-medium text-[#010D50]">3</span>
              </div>
              <span className="text-xs font-medium text-[#010D50]">
                Payment Details
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-5 h-5 rounded-full border border-[#010D50] flex items-center justify-center">
                <span className="text-[10px] font-medium text-[#010D50]">4</span>
              </div>
              <span className="text-xs font-medium text-[#010D50]">
                Confirmation
              </span>
            </div>
          </div>
        </div>

        {/* Content Grid */}
        <div className="flex gap-4">
          {/* Left Column - Forms */}
          <div className="flex-1 flex flex-col gap-3">
            {/* Travel Documents Alert */}
            <div className="bg-[#E7F9ED] border border-[#9FFDCC] rounded-xl p-2.5 flex items-start gap-2">
              <Info className="w-4 h-4 text-[#07BB5D] shrink-0 mt-0.5" />
              <div className="flex flex-col gap-1 text-xs text-[#07BB5D]">
                <p className="font-medium">
                  Please remember that it is your responsibility to have in your
                  possession all the necessary travel documents with you
                </p>
                <p>
                  Valid travel ID (passport or ID card). Visa for your final
                  destination and any transit countries (if required).
                </p>
                <p>
                  We strongly recommend you check the entry requirements for any
                  country you travel through. You can find this info on the
                  website of the countries&apos; relevant authorities, or via your
                  embassy or consulate.
                </p>
              </div>
            </div>

            {/* Price Change Alert */}
            <div className="bg-[#010D50] rounded-xl p-2.5 flex items-start gap-2">
              <Info className="w-4 h-4 text-white shrink-0 mt-0.5" />
              <div className="flex flex-col gap-1 text-xs text-white">
                <p className="font-semibold">
                  Heads up! The result for your search is now coming back with a
                  different price.
                </p>
                <p>
                  Ticket price changed from £94,348 to £94,353. You can
                  continue, or we can help you find other flights.
                </p>
              </div>
            </div>

            {/* Baggage Alert */}
            <div className="bg-[#FFE1E1] border border-[#FF9393] rounded-xl p-2.5 flex items-start gap-2">
              <Info className="w-4 h-4 text-[#FF0202] shrink-0 mt-0.5" />
              <div className="flex flex-col gap-1 text-xs text-[#FF0202]">
                <p className="font-medium">Baggage Alert: Re-Check Required</p>
                <p>
                  Due to airline or flight changes during your stop, you MUST
                  collect your checked luggage and re-check it with the
                  connecting airline. Always confirm your baggage tag
                  instructions upon arrival at your layover city.
                </p>
              </div>
            </div>

            {/* Flight Summary Cards */}
            <div className="flex flex-col gap-3">
              {/* Outbound Flight */}
              <div className="bg-[#F5F7FF] rounded-xl p-4 flex gap-4">
                <div className="flex-1 flex flex-col gap-6">
                  <span className="text-sm font-semibold text-[#010D50]">
                    London to Lagos
                  </span>
                  <div className="flex flex-col gap-3">
                    <div className="flex items-center gap-3">
                      <div className="flex items-center gap-3">
                        <span className="text-sm text-[#010D50]">LGW</span>
                        <span className="text-sm font-semibold text-[#010D50]">
                          16:40
                        </span>
                      </div>
                      <svg width="61" height="5" viewBox="0 0 61 5" fill="none">
                        <circle cx="20" cy="2.5" r="2.5" fill="#010D50" />
                        <line
                          x1="0"
                          y1="2.5"
                          x2="61"
                          y2="2.5"
                          stroke="#010D50"
                          strokeDasharray="4 4"
                        />
                      </svg>
                      <div className="flex items-center gap-3">
                        <div className="flex items-center gap-1">
                          <span className="text-sm font-semibold text-[#010D50]">
                            05:50
                          </span>
                          <span className="text-xs text-[#FF0202]">+1</span>
                        </div>
                        <span className="text-sm text-[#010D50]">LOS</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 text-sm text-[#010D50]">
                      <span>1 Stop</span>
                      <div className="w-1 h-1 rounded-full bg-[#010D50]" />
                      <span>13h 10m</span>
                      <div className="w-1 h-1 rounded-full bg-[#010D50]" />
                      <span>Sun, 9 Oct</span>
                    </div>
                  </div>
                </div>
                <div className="flex flex-col justify-between items-end gap-2">
                  <div className="flex items-center gap-2">
                    <div className="w-10 h-10 bg-[#DA0E29] rounded flex items-center justify-center">
                      <Plane className="w-5 h-5 text-white" />
                    </div>
                    <span className="text-sm font-semibold text-[#010D50]">
                      Royal Air Maroc
                    </span>
                  </div>
                  <div className="flex items-center gap-3 text-sm text-[#010D50]">
                    <span>Economy</span>
                    <div className="w-1 h-1 rounded-full bg-[#010D50]" />
                    <span>1 Adult</span>
                  </div>
                  <span className="text-sm font-medium text-[#3754ED] cursor-pointer">
                    View Details
                  </span>
                </div>
              </div>

              {/* Return Flight */}
              <div className="bg-[#F5F7FF] rounded-xl p-4 flex gap-4">
                <div className="flex-1 flex flex-col gap-6">
                  <span className="text-sm font-semibold text-[#010D50]">
                    Lagos to London
                  </span>
                  <div className="flex flex-col gap-3">
                    <div className="flex items-center gap-3">
                      <div className="flex items-center gap-3">
                        <span className="text-sm text-[#010D50]">LOS</span>
                        <span className="text-sm font-semibold text-[#010D50]">
                          05:50
                        </span>
                      </div>
                      <svg width="61" height="5" viewBox="0 0 61 5" fill="none">
                        <circle cx="20" cy="2.5" r="2.5" fill="#010D50" />
                        <line
                          x1="0"
                          y1="2.5"
                          x2="61"
                          y2="2.5"
                          stroke="#010D50"
                          strokeDasharray="4 4"
                        />
                      </svg>
                      <div className="flex items-center gap-3">
                        <div className="flex items-center gap-1">
                          <span className="text-sm font-semibold text-[#010D50]">
                            16:40
                          </span>
                          <span className="text-xs text-[#FF0202]">+1</span>
                        </div>
                        <span className="text-sm text-[#010D50]">LGW</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 text-sm text-[#010D50]">
                      <span>1 Stop</span>
                      <div className="w-1 h-1 rounded-full bg-[#010D50]" />
                      <span>13h 10m</span>
                      <div className="w-1 h-1 rounded-full bg-[#010D50]" />
                      <span>Wed, 12 Oct</span>
                    </div>
                  </div>
                </div>
                <div className="flex flex-col justify-between items-end gap-2">
                  <div className="flex items-center gap-2">
                    <div className="w-10 h-10 bg-[#DA0E29] rounded flex items-center justify-center">
                      <Plane className="w-5 h-5 text-white" />
                    </div>
                    <span className="text-sm font-semibold text-[#010D50]">
                      Royal Air Maroc
                    </span>
                  </div>
                  <div className="flex items-center gap-3 text-sm text-[#010D50]">
                    <span>Economy</span>
                    <div className="w-1 h-1 rounded-full bg-[#010D50]" />
                    <span>1 Adult</span>
                  </div>
                  <span className="text-sm font-medium text-[#3754ED] cursor-pointer">
                    View Details
                  </span>
                </div>
              </div>
            </div>

            {/* Passenger Details Form */}
            <div className="bg-white border border-[#DFE0E4] rounded-xl p-4 flex flex-col gap-6">
              {/* Header */}
              <div className="flex items-center gap-3">
                <span className="text-sm font-semibold text-[#010D50]">
                  Passenger Details
                </span>
              </div>

              {/* Instructions */}
              <div className="bg-[#FFF5EA] rounded-xl p-3 flex items-start gap-2">
                <Info className="w-5 h-5 text-[#E98E03] shrink-0" />
                <p className="text-sm text-[#E98E03]">
                  Please enter passenger name(s) and dates(s) of birth EXACTLY as
                  shown on the passport or their government-issued ID that will be
                  used for this trip
                </p>
              </div>

              {/* Lead Passenger */}
              <div className="flex flex-col gap-6">
                <div className="flex items-center gap-3">
                  <div className="bg-[#F5F7FF] rounded-full px-6 py-3">
                    <span className="text-sm font-semibold text-[#010D50]">
                      Lead Passenger
                    </span>
                  </div>
                  <span className="text-sm text-[#010D50]">
                    (Must be 18 or older)
                  </span>
                </div>

                {/* Form Fields */}
                <div className="flex gap-3">
                  <div className="flex flex-col gap-2 flex-1">
                    <label className="text-sm font-medium text-[#010D50]">
                      Name
                    </label>
                    <div className="flex gap-2">
                      <select className="border border-[#DFE0E4] rounded-xl px-4 py-3 text-base font-medium text-[#010D50] bg-white w-24">
                        <option>Mr.</option>
                        <option>Mrs.</option>
                        <option>Ms.</option>
                      </select>
                      <Input
                        placeholder="First Name"
                        className="flex-1 border-[#DFE0E4] rounded-xl px-4 py-3 text-base font-medium text-[#3A478A]"
                      />
                      <Input
                        placeholder="Middle Name"
                        className="flex-1 border-[#DFE0E4] rounded-xl px-4 py-3 text-base font-medium text-[#3A478A]"
                      />
                      <Input
                        placeholder="Last Name"
                        className="flex-1 border-[#DFE0E4] rounded-xl px-4 py-3 text-base font-medium text-[#3A478A]"
                      />
                    </div>
                  </div>
                </div>

                <div className="flex gap-3">
                  <div className="flex flex-col gap-2 flex-1">
                    <label className="text-sm font-medium text-[#010D50]">
                      Date of Birth
                    </label>
                    <Input
                      type="date"
                      placeholder="DD/MM/YYYY"
                      className="border-[#DFE0E4] rounded-xl px-4 py-3 text-base font-medium text-[#3A478A]"
                    />
                  </div>
                  <div className="flex flex-col gap-2 flex-1">
                    <label className="text-sm font-medium text-[#010D50]">
                      Email ID
                    </label>
                    <Input
                      type="email"
                      placeholder="xyz123@gmail.com"
                      className="border-[#DFE0E4] rounded-xl px-4 py-3 text-base font-medium text-[#3A478A]"
                    />
                  </div>
                  <div className="flex flex-col gap-2 flex-1">
                    <label className="text-sm font-medium text-[#010D50]">
                      Phone no.
                    </label>
                    <Input
                      type="tel"
                      placeholder="1234567890"
                      className="border-[#DFE0E4] rounded-xl px-4 py-3 text-base font-medium text-[#3A478A]"
                    />
                  </div>
                </div>
              </div>

              {/* Divider */}
              <div className="border-t border-[#3A478A]" />

              {/* Additional Passengers can be added similarly */}
              <div className="flex items-center gap-3">
                <div className="bg-[#F5F7FF] rounded-full px-6 py-3">
                  <span className="text-sm font-semibold text-[#010D50]">
                    Passenger 2
                  </span>
                </div>
                <span className="text-sm text-[#3A478A]">(Adult)</span>
              </div>

              {/* Similar form fields as above */}
              <div className="flex gap-3">
                <div className="flex flex-col gap-2 flex-1">
                  <label className="text-sm font-medium text-[#010D50]">
                    Name
                  </label>
                  <div className="flex gap-2">
                    <select className="border border-[#DFE0E4] rounded-xl px-4 py-3 text-base font-medium text-[#010D50] bg-white w-24">
                      <option>Mr.</option>
                      <option>Mrs.</option>
                      <option>Ms.</option>
                    </select>
                    <Input
                      placeholder="First Name"
                      className="flex-1 border-[#DFE0E4] rounded-xl px-4 py-3 text-base font-medium text-[#3A478A]"
                    />
                    <Input
                      placeholder="Middle Name"
                      className="flex-1 border-[#DFE0E4] rounded-xl px-4 py-3 text-base font-medium text-[#3A478A]"
                    />
                    <Input
                      placeholder="Last Name"
                      className="flex-1 border-[#DFE0E4] rounded-xl px-4 py-3 text-base font-medium text-[#3A478A]"
                    />
                  </div>
                </div>
              </div>

              <div className="flex flex-col gap-2">
                <label className="text-sm font-medium text-[#010D50]">
                  Date of Birth
                </label>
                <Input
                  type="date"
                  placeholder="DD/MM/YYYY"
                  className="border-[#DFE0E4] rounded-xl px-4 py-3 text-base font-medium text-[#3A478A]"
                />
              </div>
            </div>

            {/* Terms & Conditions */}
            <div className="bg-white border border-[#DFE0E4] rounded-xl p-4 flex flex-col gap-6">
              <div className="flex items-start gap-2">
                <Checkbox className="mt-1" />
                <p className="text-sm font-medium leading-relaxed text-[#010D50]">
                  By clicking this checkbox, I acknowledge that I have read and
                  accepted Globehunters Terms & Conditions and Privacy Policy
                </p>
              </div>
              <div className="flex items-start gap-2">
                <Checkbox className="mt-1" />
                <p className="text-sm font-medium leading-relaxed text-[#010D50]">
                  By clicking this checkbox, I consent to receive marketing
                  messages via calls, texts, and emails from Globehunters at the
                  provided contact. I understand that my consent is not a
                  condition of purchase.
                </p>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-3">
                <Button
                  onClick={() => setShowUpgradeModal(true)}
                  variant="outline"
                  className="border-[#3754ED] text-[#3754ED] rounded-full px-5 py-2 h-auto text-sm font-bold hover:bg-[#F5F7FF]"
                >
                  Upgrade options
                  <ChevronLeft className="w-5 h-5 rotate-180" />
                </Button>
                <Button
                  onClick={() => router.push("/payment")}
                  className="bg-[#3754ED] hover:bg-[#2A3FB8] text-white rounded-full px-5 py-2 h-auto text-sm font-bold"
                >
                  Book
                  <ChevronLeft className="w-5 h-5 rotate-180" />
                </Button>
              </div>
            </div>
          </div>

          {/* Right Sidebar */}
          <div className="w-[482px] flex flex-col gap-4">
            {/* Price Summary */}
            <div className="bg-white border border-[#DFE0E4] rounded-xl p-4 flex flex-col gap-6">
              <span className="text-sm font-semibold text-[#010D50]">
                Price Summary
              </span>
              <div className="flex flex-col gap-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-[#010D50]">
                    Traveler: 1 Adult
                  </span>
                  <span className="text-sm font-medium text-[#010D50]">
                    £94, 353
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-[#3A478A]">Flight fare</span>
                  <span className="text-sm text-[#3A478A]">£45,995</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-[#3A478A]">
                    Tax, fees and charges
                  </span>
                  <span className="text-sm text-[#3A478A]">£48,358</span>
                </div>
              </div>
              <div className="border-t border-[#DFE0E4]" />
              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold text-[#010D50]">
                  Trip Total
                </span>
                <span className="text-sm font-semibold text-[#010D50]">
                  £94,353.00
                </span>
              </div>
            </div>

            {/* Web Ref Card */}
            <div className="bg-white border border-[#DFE0E4] rounded-xl p-4 flex flex-col gap-4">
              <span className="text-base font-semibold text-[#3754ED]">
                WEB REF: IN-649707636
              </span>
              <p className="text-sm text-[#3A478A]">
                If you would like to speak to one of our travel consultants
                please call us on the given number below.
              </p>
              <div className="flex items-center gap-3 bg-[rgba(55,84,237,0.12)] rounded-full px-4 py-3">
                <div className="w-10 h-10 rounded-full bg-[#0B229E] flex items-center justify-center">
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

            {/* Customer Reviews */}
            <div className="bg-white border border-[#DFE0E4] rounded-xl p-4 flex flex-col gap-6">
              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold text-[#010D50]">
                  Customer Reviews
                </span>
                <div className="flex items-center gap-1 bg-white rounded-full py-1">
                  <Star className="w-5 h-5 fill-[#FBEF04] text-[#FBEF04]" />
                  <span className="text-sm font-medium text-[#010D50]">
                    4.5 (10k Reviews)
                  </span>
                </div>
              </div>

              <div className="flex gap-2 overflow-x-auto">
                {/* Review Card 1 */}
                <div className="flex-1 min-w-0">
                  <div className="bg-[#F5F7FF] rounded-lg p-3 flex flex-col gap-1">
                    <div className="flex items-center gap-1">
                      <div className="w-8 h-8 rounded-full bg-[#C0C0C0]" />
                      <span className="text-sm font-medium text-[#010D50]">
                        Sarah M.
                      </span>
                    </div>
                  </div>
                  <div className="bg-[#F5F7FF] rounded-lg p-3 mt-1">
                    <div className="flex gap-1 mb-2">
                      {[...Array(5)].map((_, i) => (
                        <Star
                          key={i}
                          className="w-3 h-3 fill-[#FBEF04] text-[#FBEF04]"
                        />
                      ))}
                    </div>
                    <p className="text-sm font-medium text-[#010D50]">
                      The booking process was incredibly fast and easy to
                      navigate. The price breakdown was clear and I appreciate
                      knowing exactly what I&apos;m paying for.
                    </p>
                  </div>
                </div>

                {/* Review Card 2 */}
                <div className="flex-1 min-w-0">
                  <div className="bg-[#F5F7FF] rounded-lg p-3 flex flex-col gap-1">
                    <div className="flex items-center gap-1">
                      <div className="w-8 h-8 rounded-full bg-[#C0C0C0]" />
                      <span className="text-sm font-medium text-[#010D50]">
                        David L.
                      </span>
                    </div>
                  </div>
                  <div className="bg-[#F5F7FF] rounded-lg p-3 mt-1">
                    <div className="flex gap-1 mb-2">
                      {[...Array(5)].map((_, i) => (
                        <Star
                          key={i}
                          className="w-3 h-3 fill-[#FBEF04] text-[#FBEF04]"
                        />
                      ))}
                    </div>
                    <p className="text-sm font-medium text-[#010D50]">
                      Found the perfect flights at a great price! Entering my
                      passenger details was straightforward and the site is very
                      user-friendly on my phone.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Upgrade Options Modal */}
      <UpgradeOptionsModal
        open={showUpgradeModal}
        onOpenChange={setShowUpgradeModal}
      />
    </div>
  );
}

export default function BookingPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <BookingContent />
    </Suspense>
  );
}

