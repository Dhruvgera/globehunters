"use client";

import { Suspense, useState } from "react";
import Navbar from "@/components/navigation/Navbar";
import Footer from "@/components/navigation/Footer";
import { ChevronLeft, Phone, Check, Briefcase, Package, ShoppingBag, XCircle, CheckCircle2, Minus, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import Link from "next/link";
import FlightInfoModal from "@/components/flights/modals/FlightInfoModal";
import { mockFlights } from "@/data/mockFlights";

function PaymentContent() {
  const [protectionPlan, setProtectionPlan] = useState<"basic" | "premium" | "all">("premium");
  const [additionalBaggage, setAdditionalBaggage] = useState(0);
  const [isIAssureExpanded, setIsIAssureExpanded] = useState(false);
  const [showFlightInfo, setShowFlightInfo] = useState(false);
  const [isPriceSummaryExpanded, setIsPriceSummaryExpanded] = useState(false);

  // Use mock flight data for demonstration
  const flight = mockFlights[0];

  // Price calculation - Single source of truth for all pricing
  // TODO: Replace with API data
  const baseFare = 94353; // Flight fare + taxes
  const protectionPlanPrices = {
    basic: 8623.68,
    premium: 10779.60,
    all: 12935.52,
  };
  const baggagePrice = 4500; // per bag
  const discountPercent = 0.20; // 20% discount

  // Calculate totals
  const protectionPlanCost = protectionPlanPrices[protectionPlan];
  const baggageCost = additionalBaggage * baggagePrice;
  const subtotal = baseFare + protectionPlanCost + baggageCost;
  const discountAmount = subtotal * discountPercent;
  const tripTotal = subtotal - discountAmount;

  return (
    <div className="min-h-screen bg-white">
      <Navbar />

      {/* Main Content */}
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-4 flex flex-col gap-4">
        {/* Back to Fare Options + Progress Steps */}
        <div className="flex flex-col gap-4">
          {/* Back Link */}
          <Link
            href="/booking"
            className="flex items-center gap-2 text-[#010D50] text-sm font-medium hover:text-[#3754ED] transition-colors w-fit"
          >
            <ChevronLeft className="w-4 h-4" />
            Back to Fare Options
          </Link>

          {/* Progress Steps - responsive: one line on mobile, bordered bar on desktop */}
          <div className="lg:bg-white lg:border lg:border-[#DFE0E4] lg:rounded-xl lg:p-4 flex items-center justify-between lg:shadow-sm gap-2 lg:gap-0">
            {/* Step 1 - Completed */}
            <div className="flex items-center gap-1.5 lg:gap-2">
              <div className="w-5 h-5 lg:w-6 lg:h-6 rounded-full bg-[#010D50] border border-[#010D50] flex items-center justify-center">
                <span className="text-[10px] lg:text-xs font-medium text-white">1</span>
              </div>
              <span className="hidden lg:inline text-xs lg:text-sm font-medium text-[#010D50]">Your details</span>
            </div>

            {/* Step 2 - Completed */}
            <div className="flex items-center gap-1.5 lg:gap-2">
              <div className="w-5 h-5 lg:w-6 lg:h-6 rounded-full bg-[#010D50] border border-[#010D50] flex items-center justify-center">
                <span className="text-[10px] lg:text-xs font-medium text-white">2</span>
              </div>
              <span className="hidden lg:inline text-xs lg:text-sm font-medium text-[#010D50]">Choose your fare</span>
            </div>

            {/* Step 3 - Current */}
            <div className="flex items-center gap-1.5 lg:gap-2">
              <div className="w-5 h-5 lg:w-6 lg:h-6 rounded-full border-2 border-[#010D50] flex items-center justify-center">
                <span className="text-[10px] lg:text-xs font-medium text-[#010D50]">3</span>
              </div>
              <span className="hidden lg:inline text-xs lg:text-sm font-medium text-[#010D50]">Payment Details</span>
            </div>

            {/* Step 4 */}
            <div className="flex items-center gap-1.5 lg:gap-2">
              <div className="w-5 h-5 lg:w-6 lg:h-6 rounded-full border border-[#010D50] flex items-center justify-center">
                <span className="text-[10px] lg:text-xs font-medium text-[#010D50]">4</span>
              </div>
              <span className="hidden lg:inline text-xs lg:text-sm font-medium text-[#010D50]">Confirmation</span>
            </div>
          </div>
        </div>

        {/* Main Layout */}
        <div className="flex flex-col lg:flex-row gap-4">
          {/* Web Ref Card - Mobile Only (shown at top) */}
          <div className="lg:hidden bg-white border border-[#DFE0E4] rounded-xl p-3 flex flex-col gap-4">
            <span className="text-base font-semibold text-[#3754ED]">WEB REF: IN-649707636</span>
            <div className="flex items-center gap-2 bg-[rgba(55,84,237,0.12)] rounded-[40px] px-4 py-2 w-fit">
              <div className="w-9 h-9 rounded-full bg-[#0B229E] flex items-center justify-center">
                <Phone className="w-5 h-5 text-white" />
              </div>
              <div className="flex flex-col">
                <span className="text-[#010D50] text-sm font-bold">020 4502 2984</span>
              </div>
            </div>
          </div>

          {/* Left Column */}
          <div className="flex-1 flex flex-col gap-4">
            {/* Flight Summary Cards */}
            <div className="flex flex-col gap-3">
              {/* London to Lagos */}
              <div className="bg-[#F5F7FF] rounded-xl p-3 flex flex-col gap-3">
                {/* Mobile: Compact view */}
                <div className="flex lg:hidden items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 bg-[#DA0E29] rounded flex items-center justify-center">
                      <span className="text-white text-xs font-bold">RAM</span>
                    </div>
                    <span className="text-xs font-semibold text-[#010D50]">London to Lagos</span>
                  </div>
                </div>
                <div className="flex lg:hidden items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="flex flex-col">
                      <span className="text-xs text-[#3A478A]">LGW</span>
                      <span className="text-sm font-semibold text-[#010D50]">16:40</span>
                    </div>
                    <span className="text-xs text-[#3A478A]">→</span>
                    <div className="flex flex-col">
                      <span className="text-xs text-[#3A478A]">LOS</span>
                      <span className="text-sm font-semibold text-[#010D50]">05:50</span>
                    </div>
                  </div>
                  <div className="flex flex-col items-end">
                    <span className="text-xs text-[#3A478A]">Duration</span>
                    <span className="text-sm font-semibold text-[#010D50]">13h 10m</span>
                  </div>
                </div>
                <Button
                  variant="link"
                  onClick={() => setShowFlightInfo(true)}
                  className="lg:hidden text-sm font-medium text-[#3754ED] p-0 h-auto w-fit"
                >
                  View Details
                </Button>

                {/* Desktop: Full view */}
                <div className="hidden lg:flex flex-col gap-6">
                  <span className="text-sm font-semibold text-[#010D50]">London to Lagos</span>
                  <div className="flex items-center justify-between">
                    <div className="flex flex-col gap-1">
                      <span className="text-sm font-semibold text-[#010D50]">LGW</span>
                      <span className="text-sm font-semibold text-[#010D50]">16:40</span>
                    </div>
                    <div className="flex flex-col items-center flex-1 mx-4">
                      <div className="flex items-center w-full relative">
                        <div className="flex-1 border-t border-dashed border-[#010D50]" />
                        <svg width="61" height="5" viewBox="0 0 61 5" fill="none" className="absolute left-1/2 -translate-x-1/2">
                          <circle cx="20" cy="2.5" r="2.5" fill="#010D50" />
                          <line x1="0" y1="2.5" x2="61" y2="2.5" stroke="#010D50" strokeDasharray="2 2" />
                        </svg>
                        <div className="flex-1 border-t border-dashed border-[#010D50]" />
                      </div>
                      <div className="flex items-center gap-3 mt-3">
                        <span className="text-sm font-medium text-[#010D50]">1 Stop</span>
                        <div className="w-1 h-1 rounded-full bg-[#010D50]" />
                        <span className="text-sm font-medium text-[#010D50]">13h 10m</span>
                        <div className="w-1 h-1 rounded-full bg-[#010D50]" />
                        <span className="text-sm font-medium text-[#010D50]">Sun, 9 Oct</span>
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      <div className="flex items-end gap-1">
                        <span className="text-sm font-semibold text-[#010D50]">05:50</span>
                        <span className="text-xs text-[#FF0202]">+1</span>
                      </div>
                      <span className="text-sm font-semibold text-[#010D50]">LOS</span>
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-12 h-8 bg-[#DA0E29] rounded flex items-center justify-center">
                        <span className="text-white text-base font-bold">RAM</span>
                      </div>
                      <span className="text-sm font-semibold text-[#010D50]">Royal Air Maroc</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-sm text-[#010D50]">Economy</span>
                      <div className="w-1 h-1 rounded-full bg-[#010D50]" />
                      <span className="text-sm text-[#010D50]">1 Adult</span>
                    </div>
                    <Button
                      variant="link"
                      onClick={() => setShowFlightInfo(true)}
                      className="text-[#3754ED] text-sm font-medium p-0 h-auto"
                    >
                      View Details
                    </Button>
                  </div>
                </div>
              </div>

              {/* Lagos to London */}
              <div className="bg-[#F5F7FF] rounded-xl p-3 flex flex-col gap-3">
                {/* Mobile: Compact view */}
                <div className="flex lg:hidden items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 bg-[#DA0E29] rounded flex items-center justify-center">
                      <span className="text-white text-xs font-bold">RAM</span>
                    </div>
                    <span className="text-xs font-semibold text-[#010D50]">Lagos to London</span>
                  </div>
                </div>
                <div className="flex lg:hidden items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="flex flex-col">
                      <span className="text-xs text-[#3A478A]">LOS</span>
                      <span className="text-sm font-semibold text-[#010D50]">05:50</span>
                    </div>
                    <span className="text-xs text-[#3A478A]">→</span>
                    <div className="flex flex-col">
                      <span className="text-xs text-[#3A478A]">LGW</span>
                      <span className="text-sm font-semibold text-[#010D50]">16:40</span>
                    </div>
                  </div>
                  <div className="flex flex-col items-end">
                    <span className="text-xs text-[#3A478A]">Duration</span>
                    <span className="text-sm font-semibold text-[#010D50]">13h 10m</span>
                  </div>
                </div>
                <Button
                  variant="link"
                  onClick={() => setShowFlightInfo(true)}
                  className="lg:hidden text-sm font-medium text-[#3754ED] p-0 h-auto w-fit"
                >
                  View Details
                </Button>

                {/* Desktop: Full view */}
                <div className="hidden lg:flex flex-col gap-6">
                  <span className="text-sm font-semibold text-[#010D50]">Lagos to London</span>
                  <div className="flex items-center justify-between">
                    <div className="flex flex-col gap-1">
                      <span className="text-sm font-semibold text-[#010D50]">LOS</span>
                      <span className="text-sm font-semibold text-[#010D50]">05:50</span>
                    </div>
                    <div className="flex flex-col items-center flex-1 mx-4">
                      <div className="flex items-center w-full relative">
                        <div className="flex-1 border-t border-dashed border-[#010D50]" />
                        <svg width="61" height="5" viewBox="0 0 61 5" fill="none" className="absolute left-1/2 -translate-x-1/2">
                          <circle cx="20" cy="2.5" r="2.5" fill="#010D50" />
                          <line x1="0" y1="2.5" x2="61" y2="2.5" stroke="#010D50" strokeDasharray="2 2" />
                        </svg>
                        <div className="flex-1 border-t border-dashed border-[#010D50]" />
                      </div>
                      <div className="flex items-center gap-3 mt-3">
                        <span className="text-sm font-medium text-[#010D50]">1 Stop</span>
                        <div className="w-1 h-1 rounded-full bg-[#010D50]" />
                        <span className="text-sm font-medium text-[#010D50]">13h 10m</span>
                        <div className="w-1 h-1 rounded-full bg-[#010D50]" />
                        <span className="text-sm font-medium text-[#010D50]">Wed, 12 Oct</span>
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      <div className="flex items-end gap-1">
                        <span className="text-sm font-semibold text-[#010D50]">16:40</span>
                        <span className="text-xs text-[#FF0202]">+1</span>
                      </div>
                      <span className="text-sm font-semibold text-[#010D50]">LGW</span>
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-12 h-8 bg-[#DA0E29] rounded flex items-center justify-center">
                        <span className="text-white text-base font-bold">RAM</span>
                      </div>
                      <span className="text-sm font-semibold text-[#010D50]">Royal Air Maroc</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-sm text-[#010D50]">Economy</span>
                      <div className="w-1 h-1 rounded-full bg-[#010D50]" />
                      <span className="text-sm text-[#010D50]">1 Adult</span>
                    </div>
                    <Button
                      variant="link"
                      onClick={() => setShowFlightInfo(true)}
                      className="text-[#3754ED] text-sm font-medium p-0 h-auto"
                    >
                      View Details
                    </Button>
                  </div>
                </div>
              </div>
            </div>

            {/* Baggage Allowance Section */}
            <div className="bg-white border border-[#DFE0E4] rounded-xl p-3 flex flex-col gap-6">
              <div className="flex items-center justify-between">
                <div className="bg-[#F5F7FF] rounded-full px-4 py-3">
                  <span className="text-sm font-semibold text-[#010D50]">Baggage Allowance</span>
                </div>
                <div className="bg-[#F5F7FF] rounded-full px-3 py-1.5">
                  <span className="text-sm font-medium text-[#3754ED]">
                    For more information on baggage, Call Now
                  </span>
                </div>
              </div>

              {/* Baggage Items */}
              <div className="flex flex-col gap-5">
                {/* Personal item */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <ShoppingBag className="w-6 h-6 text-[#010D50]" />
                    <div className="flex flex-col gap-1">
                      <span className="text-sm font-medium text-[#010D50]">Personal item</span>
                      <span className="text-sm text-[#3A478A]">Fits under the seat</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <CheckCircle2 className="w-5 h-5 text-[#008234]" />
                    <span className="text-sm font-medium text-[#008234]">Included</span>
                  </div>
                </div>

                {/* Carry-on bag */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Briefcase className="w-6 h-6 text-[#010D50]" />
                    <div className="flex flex-col gap-1">
                      <span className="text-sm font-medium text-[#010D50]">Carry-on bag</span>
                      <span className="text-sm text-[#3A478A]">(56cm x 36cm x 23cm)</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <CheckCircle2 className="w-5 h-5 text-[#008234]" />
                    <span className="text-sm font-medium text-[#008234]">Included</span>
                  </div>
                </div>

                {/* Checked bags - Not Included */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Package className="w-6 h-6 text-[#010D50]" />
                    <div className="flex flex-col gap-1">
                      <span className="text-sm font-medium text-[#010D50]">Checked bags</span>
                      <span className="text-sm text-[#3A478A]">Per person each way</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <XCircle className="w-5 h-5 text-[#FF0202]" />
                    <span className="text-sm font-medium text-[#FF0202]">Not Included</span>
                  </div>
                </div>

                {/* Add Additional Baggage */}
                <div className="flex flex-col gap-3">
                  <div className="flex items-start justify-between w-full">
                    <div className="flex items-center gap-3">
                      <Package className="w-6 h-6 text-[#010D50] shrink-0" />
                      <div className="flex flex-col gap-1">
                        <span className="text-sm font-medium text-[#010D50]">Add additional baggage</span>
                        <span className="text-sm text-[#3A478A]">Add additional checked bags</span>
                      </div>
                    </div>
                  </div>

                  {/* Price and Counter - Below on mobile, inline on desktop */}
                  <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-3 lg:gap-2 pl-0 lg:pl-9">
                    <span className="text-sm font-semibold text-[#010D50]">₹4500 /per person (20kg)</span>
                    <div className="bg-[rgba(55,84,237,0.12)] rounded-full px-4 py-3 flex items-center gap-2">
                      <button
                        onClick={() => setAdditionalBaggage(Math.max(0, additionalBaggage - 1))}
                        className="text-[#3754ED] hover:text-[#2A3FB8]"
                      >
                        <Minus className="w-5 h-5" />
                      </button>
                      <span className="text-sm font-medium text-[#3754ED] min-w-[20px] text-center">
                        {additionalBaggage}
                      </span>
                      <button
                        onClick={() => setAdditionalBaggage(additionalBaggage + 1)}
                        className="text-[#3754ED] hover:text-[#2A3FB8]"
                      >
                        <Plus className="w-5 h-5" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* iAssure Protection Plan */}
            <div className="bg-white border-2 border-[#3754ED] rounded-xl p-3 flex flex-col gap-3 relative">
              <div className="flex items-center justify-between">
                <div className="bg-[#F5F7FF] rounded-full px-4 py-3 w-fit">
                  <span className="text-sm font-semibold text-[#010D50]">
                    iAssure Protection (Recommended)
                  </span>
                </div>
                <Button
                  variant="ghost"
                  onClick={() => setIsIAssureExpanded(!isIAssureExpanded)}
                  className="lg:hidden text-[#3754ED] h-auto p-2 text-sm"
                >
                  {isIAssureExpanded ? "Hide Plans" : "Compare Plans"}
                </Button>
              </div>

              {/* Mobile: Card-based layout */}
              <div className={`lg:hidden flex flex-col gap-3 ${isIAssureExpanded ? "flex" : "hidden"}`}>
                {/* Basic Plan */}
                <div
                  onClick={() => setProtectionPlan("basic")}
                  className={`border-2 rounded-xl p-3 cursor-pointer transition-all ${
                    protectionPlan === "basic" ? "border-[#3754ED] bg-[#F5F7FF]" : "border-[#DFE0E4] bg-white"
                  }`}
                >
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <h3 className="text-sm font-semibold text-[#010D50]">Basic</h3>
                      <p className="text-lg font-bold text-[#3754ED] mt-1">₹8,623.68</p>
                    </div>
                    <Checkbox checked={protectionPlan === "basic"} />
                  </div>
                  <div className="flex flex-col gap-2">
                    {[
                      "24/7 Support",
                      "Free changes in 24hrs",
                      "100% refund on death",
                      "100% refund on airline cancellation",
                    ].map((feature, i) => (
                      <div key={i} className="flex items-start gap-2">
                        <Check className="w-4 h-4 text-[#008234] shrink-0 mt-0.5" />
                        <span className="text-xs text-[#010D50]">{feature}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Premium Plan */}
                <div
                  onClick={() => setProtectionPlan("premium")}
                  className={`border-2 rounded-xl p-3 cursor-pointer transition-all ${
                    protectionPlan === "premium" ? "border-[#3754ED] bg-[#F5F7FF]" : "border-[#DFE0E4] bg-white"
                  }`}
                >
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <h3 className="text-sm font-semibold text-[#010D50]">Premium</h3>
                      <p className="text-lg font-bold text-[#3754ED] mt-1">₹10,779.60</p>
                    </div>
                    <Checkbox checked={protectionPlan === "premium"} />
                  </div>
                  <div className="flex flex-col gap-2">
                    {[
                      "All Basic features",
                      "Free changes anytime",
                      "Refund on lockdown/travel ban",
                      "Baggage compensation",
                      "Flight delay compensation",
                    ].map((feature, i) => (
                      <div key={i} className="flex items-start gap-2">
                        <Check className="w-4 h-4 text-[#008234] shrink-0 mt-0.5" />
                        <span className="text-xs text-[#010D50]">{feature}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* All Included Plan */}
                <div
                  onClick={() => setProtectionPlan("all")}
                  className={`border-2 rounded-xl p-3 cursor-pointer transition-all ${
                    protectionPlan === "all" ? "border-[#3754ED] bg-[#F5F7FF]" : "border-[#DFE0E4] bg-white"
                  }`}
                >
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <h3 className="text-sm font-semibold text-[#010D50]">All Included</h3>
                      <p className="text-lg font-bold text-[#3754ED] mt-1">₹12,935.52</p>
                    </div>
                    <Checkbox checked={protectionPlan === "all"} />
                  </div>
                  <div className="flex flex-col gap-2">
                    {[
                      "All Premium features",
                      "24hrs price match guarantee",
                      "₹25 credit for future bookings",
                      "Priority customer service",
                    ].map((feature, i) => (
                      <div key={i} className="flex items-start gap-2">
                        <Check className="w-4 h-4 text-[#008234] shrink-0 mt-0.5" />
                        <span className="text-xs text-[#010D50]">{feature}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Desktop: Table layout */}
              <div className="hidden lg:flex flex-col gap-1">
                {/* Price Row */}
                <div className="flex items-center justify-between bg-[#F5F7FF] rounded-lg p-3">
                  <span className="w-[524px] text-sm font-medium text-[#010D50] opacity-0">Price</span>
                  <div className="flex items-center gap-0">
                    <div className="w-[109px] text-center py-0.5">
                      <span className="text-sm font-medium text-[#010D50]">₹8,623.68</span>
                    </div>
                    <div className="w-[109px] text-center py-0.5">
                      <span className="text-sm font-medium text-[#010D50]">₹10,779.60</span>
                    </div>
                    <div className="w-[109px] text-center py-0.5">
                      <span className="text-sm font-medium text-[#010D50]">₹12,935.52</span>
                    </div>
                  </div>
                </div>

                {/* Features */}
                {[
                  "One-on-One 24/7 Support",
                  "Rebook, rename and cancel in first 24hrs for free",
                  "100% refund in the event of passenger's death",
                  "Free changes anytime",
                  "100% refund in case of cancellations by airlines",
                  "Refund in case of State lockdown, travel ban, or mechanical failure",
                  "Compensation per mishandled checked-in bag",
                  "Flight delay compensation",
                  "24hrs price match guarantee",
                  "₹25 credit for future bookings",
                ].map((feature, i) => (
                  <div key={i} className="flex items-center justify-between p-3 border-b border-[#F5F7FF]">
                    <span className="w-[524px] text-sm font-medium text-[#010D50]">{feature}</span>
                    <div className="flex items-center gap-0">
                      <div className="w-[109px] flex items-center justify-center">
                        <Check className="w-4 h-4 text-[#008234]" />
                      </div>
                      <div className="w-[109px] flex items-center justify-center">
                        <Check className="w-4 h-4 text-[#008234]" />
                      </div>
                      <div className="w-[109px] flex items-center justify-center">
                        <Check className="w-4 h-4 text-[#008234]" />
                      </div>
                    </div>
                  </div>
                ))}

                {/* Plan Selection Row */}
                <div className="flex items-center justify-between p-3">
                  <span className="w-[524px] opacity-0">Select</span>
                  <div className="flex items-center gap-0">
                    <div
                      role="button"
                      tabIndex={0}
                      onClick={() => setProtectionPlan("basic")}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") {
                          e.preventDefault();
                          setProtectionPlan("basic");
                        }
                      }}
                      className="w-[109px] flex flex-col items-center justify-center gap-1 py-0.5 cursor-pointer"
                    >
                      <Checkbox checked={protectionPlan === "basic"} />
                      <span className="text-xs font-medium text-[#010D50]">Basic</span>
                    </div>
                    <div
                      role="button"
                      tabIndex={0}
                      onClick={() => setProtectionPlan("premium")}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") {
                          e.preventDefault();
                          setProtectionPlan("premium");
                        }
                      }}
                      className="w-[109px] flex flex-col items-center justify-center gap-1 py-0.5 cursor-pointer"
                    >
                      <Checkbox checked={protectionPlan === "premium"} />
                      <span className="text-xs font-medium text-[#010D50]">Premium</span>
                    </div>
                    <div
                      role="button"
                      tabIndex={0}
                      onClick={() => setProtectionPlan("all")}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") {
                          e.preventDefault();
                          setProtectionPlan("all");
                        }
                      }}
                      className="w-[109px] flex flex-col items-center justify-center gap-1 py-0.5 cursor-pointer"
                    >
                      <Checkbox checked={protectionPlan === "all"} />
                      <span className="text-xs font-medium text-[#010D50]">All Included</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Payment Details */}
            <div className="bg-white border border-[#DFE0E4] rounded-xl p-3 flex flex-col gap-6">
              <div className="flex items-center justify-between">
                <div className="bg-[#F5F7FF] rounded-full px-4 py-3 w-fit">
                  <span className="text-sm font-semibold text-[#010D50]">Payment Details</span>
                </div>
                {/* Mobile: Total Payment Amount */}
                <div className="lg:hidden bg-[#F5F7FF] rounded-full px-3 py-1.5">
                  <span className="text-sm font-semibold text-[#010D50]">
                    Total: ₹{tripTotal.toLocaleString('en-IN', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}
                  </span>
                </div>
              </div>

              <div className="flex flex-col gap-3">
                {/* Card Number */}
                <div className="flex flex-col gap-2">
                  <label className="text-sm font-medium text-[#010D50]">Card Number</label>
                  <Input
                    placeholder="1234 5678 1234 5678"
                    className="border border-[#DFE0E4] rounded-xl px-4 py-3 text-base font-medium w-full"
                  />
                </div>

                {/* Cardholder Name */}
                <div className="flex flex-col gap-2">
                  <label className="text-sm font-medium text-[#010D50]">Cardholder Name</label>
                  <Input
                    placeholder="Name"
                    className="border border-[#DFE0E4] rounded-xl px-4 py-3 text-base font-medium w-full"
                  />
                </div>

                {/* Expiry and CVV */}
                <div className="flex flex-col sm:flex-row gap-3">
                  <div className="flex-1 flex flex-col gap-2">
                    <label className="text-sm font-medium text-[#010D50]">Expiry Date</label>
                    <Input
                      placeholder="01/26"
                      className="border border-[#DFE0E4] rounded-xl px-4 py-3 text-base font-medium w-full"
                    />
                  </div>
                  <div className="w-full sm:w-[383px] flex flex-col gap-2">
                    <label className="text-sm font-medium text-[#010D50]">CVV/CVC</label>
                    <Input
                      placeholder="123"
                      className="border border-[#DFE0E4] rounded-xl px-4 py-3 text-base font-medium w-full"
                    />
                  </div>
                </div>
              </div>

              {/* Divider */}
              <div className="border-t border-[#3A478A]" />

              {/* Billing Address */}
              <div className="flex flex-col gap-6">
                <div className="bg-[#F5F7FF] rounded-full px-4 py-3 w-fit">
                  <span className="text-sm font-semibold text-[#010D50]">Billing Address</span>
                </div>

                <div className="flex flex-col gap-3">
                  {/* Street Address Row */}
                  <div className="flex gap-3">
                    <div className="flex-1 flex flex-col gap-2">
                      <label className="text-sm font-medium text-[#010D50]">Street Address 1</label>
                      <Input
                        placeholder="Street Address"
                        className="border border-[#DFE0E4] rounded-xl px-4 py-3 text-base font-medium w-full"
                      />
                    </div>
                    <div className="flex-1 flex flex-col gap-2">
                      <label className="text-sm font-medium text-[#010D50]">Street Address 2</label>
                      <Input
                        placeholder="Street Address"
                        className="border border-[#DFE0E4] rounded-xl px-4 py-3 text-base font-medium w-full"
                      />
                    </div>
                  </div>

                  {/* City, State, Zip Row */}
                  <div className="flex flex-col sm:flex-row gap-3">
                    <div className="w-full sm:w-[392px] flex flex-col gap-2">
                      <label className="text-sm font-medium text-[#010D50]">City</label>
                      <Input
                        placeholder="Town/City"
                        className="border border-[#DFE0E4] rounded-xl px-4 py-3 text-base font-medium w-full"
                      />
                    </div>
                    <div className="w-full sm:w-[262px] flex flex-col gap-2">
                      <label className="text-sm font-medium text-[#010D50]">State</label>
                      <Input
                        placeholder="123"
                        className="border border-[#DFE0E4] rounded-xl px-4 py-3 text-base font-medium w-full"
                      />
                    </div>
                    <div className="flex-1 flex flex-col gap-2">
                      <label className="text-sm font-medium text-[#010D50]">Zip/Postal Code</label>
                      <Input
                        placeholder="123"
                        className="border border-[#DFE0E4] rounded-xl px-4 py-3 text-base font-medium w-full"
                      />
                    </div>
                  </div>

                  {/* Country and Telephone Row */}
                  <div className="flex gap-3">
                    <div className="flex-1 flex flex-col gap-2">
                      <label className="text-sm font-medium text-[#010D50]">Country</label>
                      <Select>
                        <SelectTrigger className="border-[#DFE0E4] rounded-xl h-12 text-base font-medium">
                          <SelectValue placeholder="India" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="india">India</SelectItem>
                          <SelectItem value="uk">United Kingdom</SelectItem>
                          <SelectItem value="us">United States</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="flex-1 flex flex-col gap-2">
                      <label className="text-sm font-medium text-[#010D50]">Telephone</label>
                      <Input
                        placeholder="+91 "
                        className="border border-[#DFE0E4] rounded-xl px-4 py-3 text-base font-medium"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Terms and Complete Booking */}
            <div className="bg-white border border-[#DFE0E4] rounded-xl p-3 flex flex-col gap-6">
              <div className="flex items-start gap-2">
                <Checkbox id="payment-terms" className="mt-1" />
                <label
                  htmlFor="payment-terms"
                  className="text-sm font-medium text-[#010D50] leading-relaxed"
                >
                  By checking this box, I acknowledge that passenger information matches the passport
                  or official ID for travel, and that name changes are not allowed. I confirm that I
                  have reviewed the flight itinerary and agree to the Refund & Cancellation Policy. I
                  understand tickets are non-transferable and non-changeable unless stated otherwise. I
                  accept full responsibility for valid travel documentation and understand Globehunters
                  cannot be held responsible for denied boarding due to passport or visa validity.
                </label>
              </div>

              <Button className="bg-[#3754ED] hover:bg-[#2A3FB8] text-white rounded-full px-5 py-2 h-auto gap-1 text-sm font-bold w-fit">
                Complete Booking
                <ChevronLeft className="w-5 h-5 rotate-180" />
              </Button>
            </div>
          </div>

          {/* Right Sidebar */}
          <div className="w-full lg:w-[482px] flex flex-col gap-4">
            {/* Web Ref Card - Desktop Only */}
            <div className="hidden lg:flex bg-white border border-[#DFE0E4] rounded-xl p-3 flex-col gap-4">
              <span className="text-base font-semibold text-[#3754ED]">WEB REF: IN-649707636</span>
              <p className="text-sm text-[#3A478A]">
                If you would like to speak to one of our travel consultants please call us on the
                given number below.
              </p>
              <div className="flex items-center gap-2 bg-[rgba(55,84,237,0.12)] rounded-[40px] px-4 py-2 w-fit">
                <div className="w-9 h-9 rounded-full bg-[#0B229E] flex items-center justify-center">
                  <Phone className="w-5 h-5 text-white" />
                </div>
                <div className="flex flex-col">
                  <span className="text-[#010D50] text-[8px] font-medium leading-tight">
                    24/7 Toll-Free
                  </span>
                  <span className="text-[#010D50] text-sm font-bold">020 4502 2984</span>
                </div>
              </div>
            </div>

            {/* Price Summary */}
            <div className="bg-white border border-[#DFE0E4] rounded-xl p-3 flex flex-col gap-6 order-2 lg:order-none lg:sticky lg:top-20">
              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold text-[#010D50]">Price Summary</span>
                <button
                  onClick={() => setIsPriceSummaryExpanded(!isPriceSummaryExpanded)}
                  className="lg:hidden text-[#3754ED] text-sm font-medium"
                >
                  {isPriceSummaryExpanded ? "Hide Details" : "Show Details"}
                </button>
              </div>

              {/* Breakdown - Hidden on mobile unless expanded, always visible on desktop */}
              <div className={`flex-col gap-2 ${isPriceSummaryExpanded ? "flex" : "hidden lg:flex"}`}>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-[#010D50]">Traveler: 1 Adult</span>
                  <span className="text-sm font-medium text-[#010D50]">₹{baseFare.toLocaleString('en-IN')}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-[#3A478A]">Flight fare</span>
                  <span className="text-sm text-[#3A478A]">₹45,995</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-[#3A478A]">Tax, fees and charges</span>
                  <span className="text-sm text-[#3A478A]">₹48,358</span>
                </div>
              </div>

              <div className={`border-t border-[#DFE0E4] ${isPriceSummaryExpanded ? "block" : "hidden lg:block"}`} />

              <div className={`flex items-center justify-between ${isPriceSummaryExpanded ? "flex" : "hidden lg:flex"}`}>
                <span className="text-sm text-[#3A478A]">
                  iAssure Protection Plan ({protectionPlan === "basic" ? "Basic" : protectionPlan === "premium" ? "Premium" : "All Included"})
                </span>
                <span className="text-sm text-[#3A478A]">₹{protectionPlanCost.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
              </div>

              <div className={`border-t border-[#DFE0E4] ${isPriceSummaryExpanded ? "block" : "hidden lg:block"}`} />

              <div className={`flex items-center justify-between ${isPriceSummaryExpanded ? "flex" : "hidden lg:flex"}`}>
                <span className="text-sm text-[#3A478A]">Additional Baggage ({additionalBaggage} bags)</span>
                <span className="text-sm text-[#3A478A]">₹{baggageCost.toLocaleString('en-IN')}</span>
              </div>

              <div className={`border-t border-[#DFE0E4] ${isPriceSummaryExpanded ? "block" : "hidden lg:block"}`} />

              <div className={`flex items-center justify-between ${isPriceSummaryExpanded ? "flex" : "hidden lg:flex"}`}>
                <span className="text-sm text-[#3A478A]">Discount code (-{discountPercent * 100}%)</span>
                <span className="text-sm text-[#3A478A]">-₹{discountAmount.toLocaleString('en-IN', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}</span>
              </div>

              <div className={`border-t border-[#DFE0E4] ${isPriceSummaryExpanded ? "block" : "hidden lg:block"}`} />

              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold text-[#010D50]">Trip Total</span>
                <span className="text-sm font-semibold text-[#010D50]">₹{tripTotal.toLocaleString('en-IN', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Flight Info Modal */}
      <FlightInfoModal
        flight={flight}
        open={showFlightInfo}
        onOpenChange={setShowFlightInfo}
      />

      <Footer />
    </div>
  );
}

export default function PaymentPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <PaymentContent />
    </Suspense>
  );
}

