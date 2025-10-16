"use client";

import { useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Navbar from "@/components/Navbar";
import SearchBar from "@/components/SearchBar";
import FlightCard from "@/components/FlightCard";
import { mockFlights, mockDatePrices, mockAirlines, mockAirports } from "@/data/mockFlights";
import { ChevronDown, Phone, Plane } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Slider } from "@/components/ui/slider";

function SearchPageContent() {
  const searchParams = useSearchParams();
  const [selectedStops, setSelectedStops] = useState<number[]>([0]);
  const [selectedAirlines, setSelectedAirlines] = useState<string[]>([
    "Air India",
    "Air India Express",
    "Akasa Air",
    "Indigo",
  ]);
  const [selectedDepartureAirports, setSelectedDepartureAirports] = useState<string[]>([
    "BOM",
  ]);
  const [selectedArrivalAirports, setSelectedArrivalAirports] = useState<string[]>([
    "DEL",
    "AMD",
    "HYD",
  ]);
  const [priceRange, setPriceRange] = useState<[number, number]>([400, 1200]);
  const [outboundTimeRange, setOutboundTimeRange] = useState<[number, number]>([0, 24]);
  const [inboundTimeRange, setInboundTimeRange] = useState<[number, number]>([0, 24]);
  const [outboundJourneyTime, setOutboundJourneyTime] = useState<[number, number]>([0, 35]);
  const [inboundJourneyTime, setInboundJourneyTime] = useState<[number, number]>([7, 28]);

  const [expandedFilters, setExpandedFilters] = useState<{
    [key: string]: boolean;
  }>({
    stops: true,
    price: false,
    time: false,
    journey: false,
    departure: false,
    arrival: false,
    airlines: true,
  });

  const toggleFilter = (filter: string) => {
    setExpandedFilters((prev) => ({ ...prev, [filter]: !prev[filter] }));
  };

  const toggleStop = (stops: number) => {
    setSelectedStops((prev) =>
      prev.includes(stops) ? prev.filter((s) => s !== stops) : [...prev, stops]
    );
  };

  const toggleAirline = (airline: string) => {
    setSelectedAirlines((prev) =>
      prev.includes(airline)
        ? prev.filter((a) => a !== airline)
        : [...prev, airline]
    );
  };

  const toggleAllAirlines = () => {
    if (selectedAirlines.length === mockAirlines.length) {
      setSelectedAirlines([]);
    } else {
      setSelectedAirlines(mockAirlines.map((a) => a.name));
    }
  };

  const toggleDepartureAirport = (code: string) => {
    setSelectedDepartureAirports((prev) =>
      prev.includes(code) ? prev.filter((a) => a !== code) : [...prev, code]
    );
  };

  const toggleArrivalAirport = (code: string) => {
    setSelectedArrivalAirports((prev) =>
      prev.includes(code) ? prev.filter((a) => a !== code) : [...prev, code]
    );
  };

  // Filter flights based on selected filters
  const filteredFlights = mockFlights.filter((flight) => {
    const stopsMatch = selectedStops.includes(flight.outbound.stops);
    const airlineMatch = selectedAirlines.includes(flight.airline.name);
    const priceMatch =
      flight.price >= priceRange[0] && flight.price <= priceRange[1];
    return stopsMatch && airlineMatch && priceMatch;
  });

  return (
    <div className="min-h-screen bg-white">
      <Navbar />

      {/* Search Bar Section */}
      <div className="mx-auto max-w-7xl px-8 py-4">
        <SearchBar compact />
      </div>

      {/* Date Price Selector */}
      <div className="mx-auto max-w-7xl px-8 mb-6 mt-6">
        <div className="flex items-center gap-2 overflow-x-auto">
          <Button
            variant="ghost"
            size="icon"
            className="rounded-full border border-[#DFE0E4] shrink-0"
          >
            <ChevronDown className="w-6 h-6 rotate-90" />
          </Button>

          {mockDatePrices.map((datePrice, index) => (
            <div
              key={index}
              className={`flex flex-col items-center justify-between gap-2 p-3 border border-[#DFE0E4] rounded-lg flex-1 min-w-[110px] ${
                index === 3 ? "bg-white" : "bg-transparent"
              } hover:bg-gray-50 cursor-pointer transition-colors`}
            >
              <span className="text-xs text-center text-[#010D50]">
                {datePrice.date}
              </span>
              <div className="flex flex-col items-center">
                <span className="text-xs text-[#3A478A]">From</span>
                <span className="text-sm font-medium text-[#010D50]">
                  £{datePrice.price}
                </span>
              </div>
            </div>
          ))}

          <Button
            variant="ghost"
            size="icon"
            className="rounded-full border border-[#DFE0E4] shrink-0"
          >
            <ChevronDown className="w-6 h-6 -rotate-90" />
          </Button>
        </div>
      </div>

      {/* Main Content */}
      <div className="mx-auto max-w-7xl px-8 pb-8">
        <div className="flex gap-4">
          {/* Filters Sidebar */}
          <div className="w-72 flex flex-col gap-4">
            {/* Filter Header */}
            <div className="flex flex-col gap-1">
              <span className="text-lg font-semibold text-[#010D50]">
                Filters By
              </span>
              <span className="text-xs text-[#3A478A]">
                Showing {filteredFlights.length} results
              </span>
            </div>

            {/* Number of Stops */}
            <div className="bg-white border border-[#DFE0E4] rounded-xl p-4 flex flex-col gap-4">
              <button
                onClick={() => toggleFilter("stops")}
                className="flex items-center justify-between w-full"
              >
                <span className="text-sm font-semibold text-[#010D50]">
                  Number of Stops
                </span>
                <ChevronDown
                  className={`w-5 h-5 transition-transform ${
                    expandedFilters.stops ? "rotate-180" : ""
                  }`}
                />
              </button>

              {expandedFilters.stops && (
                <div className="flex flex-col gap-2">
                  <div className="flex items-center gap-2">
                    <Checkbox
                      checked={selectedStops.includes(0)}
                      onCheckedChange={() => toggleStop(0)}
                    />
                    <span className="text-sm text-[#010D50]">Non-Stop</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Checkbox
                      checked={selectedStops.includes(1)}
                      onCheckedChange={() => toggleStop(1)}
                    />
                    <span className="text-sm text-[#010D50]">1 Stop</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Checkbox
                      checked={selectedStops.includes(2)}
                      onCheckedChange={() => toggleStop(2)}
                    />
                    <span className="text-sm text-[#010D50]">2+ Stops</span>
                  </div>
                </div>
              )}
            </div>

            {/* Price Filter */}
            <div className="bg-white border border-[#DFE0E4] rounded-xl p-4 flex flex-col gap-4">
              <button
                onClick={() => toggleFilter("price")}
                className="flex items-center justify-between w-full"
              >
                <span className="text-sm font-semibold text-[#010D50]">
                  Price
                </span>
                <ChevronDown
                  className={`w-5 h-5 transition-transform ${
                    expandedFilters.price ? "rotate-180" : ""
                  }`}
                />
              </button>

              {expandedFilters.price && (
                <div className="flex flex-col items-center gap-2">
                  <Slider
                    value={priceRange}
                    onValueChange={(value) =>
                      setPriceRange(value as [number, number])
                    }
                    min={0}
                    max={2000}
                    step={50}
                    className="w-full"
                  />
                  <div className="flex items-center justify-between w-full">
                    <span className="text-xs text-[#010D50]">
                      £{priceRange[0]}
                    </span>
                    <span className="text-xs text-[#010D50]">
                      £{priceRange[1]}
                    </span>
                  </div>
                </div>
              )}
            </div>

            {/* Time Filter */}
            <div className="bg-white border border-[#DFE0E4] rounded-xl p-4 flex flex-col gap-4">
              <button
                onClick={() => toggleFilter("time")}
                className="flex items-center justify-between w-full"
              >
                <span className="text-sm font-semibold text-[#010D50]">
                  Time
                </span>
                <ChevronDown
                  className={`w-5 h-5 transition-transform ${
                    expandedFilters.time ? "rotate-180" : ""
                  }`}
                />
              </button>

              {expandedFilters.time && (
                <div className="flex flex-col gap-3">
                  <div className="flex flex-col gap-1">
                    <span className="text-xs font-medium text-[#3A478A]">
                      Outbound
                    </span>
                    <div className="flex flex-col gap-2">
                      <Slider
                        value={outboundTimeRange}
                        onValueChange={(value) =>
                          setOutboundTimeRange(value as [number, number])
                        }
                        min={0}
                        max={24}
                        step={1}
                        className="w-full"
                      />
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-[#010D50]">
                          {String(outboundTimeRange[0]).padStart(2, "0")}:00
                        </span>
                        <span className="text-xs text-[#010D50]">
                          {String(outboundTimeRange[1]).padStart(2, "0")}:00
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-col gap-1">
                    <span className="text-xs font-medium text-[#3A478A]">
                      Inbound
                    </span>
                    <div className="flex flex-col gap-2">
                      <Slider
                        value={inboundTimeRange}
                        onValueChange={(value) =>
                          setInboundTimeRange(value as [number, number])
                        }
                        min={0}
                        max={24}
                        step={1}
                        className="w-full"
                      />
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-[#010D50]">
                          {String(inboundTimeRange[0]).padStart(2, "0")}:00
                        </span>
                        <span className="text-xs text-[#010D50]">
                          {String(inboundTimeRange[1]).padStart(2, "0")}:00
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Journey Time Filter */}
            <div className="bg-white border border-[#DFE0E4] rounded-xl p-4 flex flex-col gap-4">
              <button
                onClick={() => toggleFilter("journey")}
                className="flex items-center justify-between w-full"
              >
                <span className="text-sm font-semibold text-[#010D50]">
                  Journey Time
                </span>
                <ChevronDown
                  className={`w-5 h-5 transition-transform ${
                    expandedFilters.journey ? "rotate-180" : ""
                  }`}
                />
              </button>

              {expandedFilters.journey && (
                <div className="flex flex-col gap-3">
                  <div className="flex flex-col gap-1">
                    <span className="text-xs font-medium text-[#3A478A]">
                      Outbound
                    </span>
                    <div className="flex flex-col gap-2">
                      <Slider
                        value={outboundJourneyTime}
                        onValueChange={(value) =>
                          setOutboundJourneyTime(value as [number, number])
                        }
                        min={0}
                        max={35}
                        step={1}
                        className="w-full"
                      />
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-[#010D50]">
                          {outboundJourneyTime[0]} Hours
                        </span>
                        <span className="text-xs text-[#010D50]">
                          {outboundJourneyTime[1]} Hours
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-col gap-1">
                    <span className="text-xs font-medium text-[#3A478A]">
                      Inbound
                    </span>
                    <div className="flex flex-col gap-2">
                      <Slider
                        value={inboundJourneyTime}
                        onValueChange={(value) =>
                          setInboundJourneyTime(value as [number, number])
                        }
                        min={0}
                        max={35}
                        step={1}
                        className="w-full"
                      />
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-[#010D50]">
                          {inboundJourneyTime[0]} Hours
                        </span>
                        <span className="text-xs text-[#010D50]">
                          {inboundJourneyTime[1]} Hours
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Departure Airport Filter */}
            <div className="bg-white border border-[#DFE0E4] rounded-xl p-4 flex flex-col gap-4">
              <button
                onClick={() => toggleFilter("departure")}
                className="flex items-center justify-between w-full"
              >
                <span className="text-sm font-semibold text-[#010D50]">
                  Departure Airport
                </span>
                <ChevronDown
                  className={`w-5 h-5 transition-transform ${
                    expandedFilters.departure ? "rotate-180" : ""
                  }`}
                />
              </button>

              {expandedFilters.departure && (
                <div className="flex flex-col gap-2">
                  {mockAirports.departure.map((airport) => (
                    <div
                      key={airport.code}
                      className="flex items-center justify-between"
                    >
                      <div className="flex items-center gap-2">
                        <Checkbox
                          checked={selectedDepartureAirports.includes(
                            airport.code
                          )}
                          onCheckedChange={() =>
                            toggleDepartureAirport(airport.code)
                          }
                        />
                        <span className="text-sm text-[#010D50]">
                          {airport.name}
                        </span>
                      </div>
                      <span className="text-sm font-medium text-[#010D50]">
                        £{airport.minPrice}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Arrival Airport Filter */}
            <div className="bg-white border border-[#DFE0E4] rounded-xl p-4 flex flex-col gap-4">
              <button
                onClick={() => toggleFilter("arrival")}
                className="flex items-center justify-between w-full"
              >
                <span className="text-sm font-semibold text-[#010D50]">
                  Arrival Airport
                </span>
                <ChevronDown
                  className={`w-5 h-5 transition-transform ${
                    expandedFilters.arrival ? "rotate-180" : ""
                  }`}
                />
              </button>

              {expandedFilters.arrival && (
                <div className="flex flex-col gap-2">
                  {mockAirports.arrival.map((airport) => (
                    <div
                      key={airport.code}
                      className="flex items-center justify-between"
                    >
                      <div className="flex items-center gap-2">
                        <Checkbox
                          checked={selectedArrivalAirports.includes(airport.code)}
                          onCheckedChange={() =>
                            toggleArrivalAirport(airport.code)
                          }
                        />
                        <span className="text-sm text-[#010D50]">
                          {airport.name}
                        </span>
                      </div>
                      <span className="text-sm font-medium text-[#010D50]">
                        £{airport.minPrice}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Airlines Filter */}
            <div className="bg-white border border-[#DFE0E4] rounded-xl p-4 flex flex-col gap-4">
              <button
                onClick={() => toggleFilter("airlines")}
                className="flex items-center justify-between w-full"
              >
                <span className="text-sm font-semibold text-[#010D50]">
                  Airlines
                </span>
                <ChevronDown
                  className={`w-5 h-5 transition-transform ${
                    expandedFilters.airlines ? "rotate-180" : ""
                  }`}
                />
              </button>

              {expandedFilters.airlines && (
                <div className="flex flex-col gap-2">
                  <div className="flex items-center gap-2">
                    <Checkbox
                      checked={selectedAirlines.length === mockAirlines.length}
                      onCheckedChange={toggleAllAirlines}
                    />
                    <span className="text-sm text-[#010D50]">
                      Select All
                    </span>
                  </div>

                  {mockAirlines.map((airline) => (
                    <div
                      key={airline.code}
                      className="flex items-center justify-between"
                    >
                      <div className="flex items-center gap-2">
                        <Checkbox
                          checked={selectedAirlines.includes(airline.name)}
                          onCheckedChange={() => toggleAirline(airline.name)}
                        />
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 bg-[#DA0E29] rounded flex items-center justify-center">
                            <Plane className="w-3 h-3 text-white" />
                          </div>
                          <span className="text-sm text-[#010D50]">
                            {airline.name}
                          </span>
                        </div>
                      </div>
                      <span className="text-sm font-medium text-[#010D50]">
                        £{airline.minPrice}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Flight Results */}
          <div className="flex-1 flex flex-col gap-2">
            {filteredFlights.map((flight) => (
              <FlightCard key={flight.id} flight={flight} />
            ))}
          </div>

          {/* Right Sidebar - Web Ref and Search Summary */}
          <div className="w-80 flex flex-col gap-4">
            {/* Contact Card */}
            <div className="bg-white border border-[#DFE0E4] rounded-xl p-4 flex flex-col gap-3 sticky top-4">
              <span className="text-base font-semibold text-[#3754ED]">
                WEB REF: IN-649707636
              </span>
              <p className="text-xs text-[#3A478A]">
                If you would like to speak to one of our travel consultants
                please call us on the given number below.
              </p>
              <div className="flex items-center gap-2 bg-[rgba(55,84,237,0.12)] rounded-[40px] px-4 py-2 w-fit">
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

            {/* Search Summary Card */}
            <div className="bg-white border border-[#DFE0E4] rounded-xl p-4 flex flex-col gap-3">
              <div className="flex items-center gap-2">
                <svg
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  className="text-[#010D50]"
                >
                  <path
                    d="M12 2L2 7L12 12L22 7L12 2Z"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                  <path
                    d="M2 17L12 22L22 17"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                  <path
                    d="M2 12L12 17L22 12"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
                <span className="text-sm font-semibold text-[#010D50]">
                  Search Summary
                </span>
              </div>
              <p className="text-xs text-[#3A478A]">
                If you would like to speak to one of our travel consultants
                please call us on the given number below.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function SearchPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <SearchPageContent />
    </Suspense>
  );
}

