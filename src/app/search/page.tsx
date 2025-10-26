"use client";

import { useState, Suspense, useEffect, useMemo, useRef } from "react";
import Navbar from "@/components/navigation/Navbar";
import SearchBar from "@/components/search/SearchBar";
import FlightCard from "@/components/flights/FlightCard";
import { mockFlights, mockDatePrices, mockAirlines, mockAirports } from "@/data/mockFlights";
import { ChevronDown, Phone, Plane, SlidersHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Slider } from "@/components/ui/slider";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";

function SearchPageContent() {
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
  const [isFilterSheetOpen, setIsFilterSheetOpen] = useState(false);

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

  const [selectedDateIndex, setSelectedDateIndex] = useState<number>(3);
  const dateStripRef = useRef<HTMLDivElement>(null);
  const canScroll = useMemo(() => {
    const el = dateStripRef.current;
    if (!el) return { left: false, right: false };
    return {
      left: el.scrollLeft > 0,
      right: el.scrollLeft + el.clientWidth < el.scrollWidth - 1,
    };
  }, [dateStripRef.current?.scrollLeft, dateStripRef.current?.clientWidth, dateStripRef.current?.scrollWidth]);

  const scrollDatesBy = (dir: 1 | -1) => {
    const el = dateStripRef.current;
    if (!el) return;
    const amount = el.clientWidth * 0.9; // show a bit of next page
    el.scrollBy({ left: dir * amount, behavior: "smooth" });
  };

  useEffect(() => {
    const el = dateStripRef.current;
    if (!el) return;
    const child = el.children[selectedDateIndex] as HTMLElement | undefined;
    if (child) {
      const childLeft = child.offsetLeft;
      const childRight = childLeft + child.offsetWidth;
      const viewLeft = el.scrollLeft;
      const viewRight = viewLeft + el.clientWidth;
      if (childLeft < viewLeft) el.scrollTo({ left: childLeft - 8, behavior: "smooth" });
      else if (childRight > viewRight) el.scrollTo({ left: childRight - el.clientWidth + 8, behavior: "smooth" });
    }
  }, [selectedDateIndex]);

  return (
    <div className="min-h-screen bg-white">
      <Navbar />

      {/* Search Bar Section */}
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-4">
        <SearchBar compact />
      </div>

      {/* Mobile Filter Button */}
      <div className="lg:hidden mx-auto max-w-7xl px-4 sm:px-6 mb-4">
        <Button
          onClick={() => setIsFilterSheetOpen(true)}
          className="w-full bg-[#3754ED] hover:bg-[#2942D1] text-white flex items-center justify-center gap-2"
        >
          <SlidersHorizontal className="w-5 h-5" />
          Filters ({filteredFlights.length} results)
        </Button>
      </div>

      {/* Date Price Selector */}
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 mb-6 mt-6">
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            className="rounded-full border border-[#DFE0E4] shrink-0"
            onClick={() => scrollDatesBy(-1)}
          >
            <ChevronDown className="w-6 h-6 rotate-90" />
          </Button>

          <div
            ref={dateStripRef}
            className="flex-1 flex items-stretch gap-2 overflow-x-auto no-scrollbar snap-x snap-mandatory"
          >
            {mockDatePrices.map((datePrice, index) => {
              const active = index === selectedDateIndex;
              return (
                <button
                  type="button"
                  key={index}
                  onClick={() => setSelectedDateIndex(index)}
                  className={`snap-start flex flex-col items-center justify-between gap-2 p-3 border rounded-lg min-w-[110px] sm:min-w-[120px] lg:min-w-[140px] transition-colors outline-none focus-visible:ring-0 ${
                    active ? "bg-[#F5F7FF] border-[#3754ED]" : "bg-white border-[#DFE0E4] hover:bg-gray-50"
                  }`}
                >
                  <span className="text-xs text-center text-[#010D50] truncate max-w-[120px]">
                    {datePrice.date}
                  </span>
                  <div className="flex flex-col items-center">
                    <span className="text-xs text-[#3A478A]">From</span>
                    <span className="text-sm font-medium text-[#010D50]">£{datePrice.price}</span>
                  </div>
                </button>
              );
            })}
          </div>

          <Button
            variant="ghost"
            size="icon"
            className="rounded-full border border-[#DFE0E4] shrink-0"
            onClick={() => scrollDatesBy(1)}
          >
            <ChevronDown className="w-6 h-6 -rotate-90" />
          </Button>
        </div>
      </div>

      {/* Mobile Filter Sheet */}
      <Sheet open={isFilterSheetOpen} onOpenChange={setIsFilterSheetOpen}>
        <SheetContent side="bottom" className="h-[85vh] overflow-y-auto">
          <SheetHeader>
            <SheetTitle className="text-lg font-semibold text-[#010D50]">
              Filters
            </SheetTitle>
            <span className="text-xs text-[#3A478A] text-left">
              Showing {filteredFlights.length} results
            </span>
          </SheetHeader>

          <div className="flex flex-col gap-4 mt-6">
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
                    <span className="text-xs text-[#010D50] border border-[#DFE0E4] rounded-md px-2 py-0.5 bg-white">
                      £{priceRange[0]}
                    </span>
                    <span className="text-xs text-[#010D50] border border-[#DFE0E4] rounded-md px-2 py-0.5 bg-white">
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
                        <span className="text-sm text-[#010D50] border border-[#DFE0E4] rounded-md px-2 py-0.5 bg-white">
                          {String(outboundTimeRange[0]).padStart(2, "0")}:00
                        </span>
                        <span className="text-sm text-[#010D50] border border-[#DFE0E4] rounded-md px-2 py-0.5 bg-white">
                          {outboundTimeRange[1] === 24 ? "23:59" : `${String(outboundTimeRange[1]).padStart(2, "0")}:00`}
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
                        <span className="text-sm text-[#010D50] border border-[#DFE0E4] rounded-md px-2 py-0.5 bg-white">
                          {String(inboundTimeRange[0]).padStart(2, "0")}:00
                        </span>
                        <span className="text-sm text-[#010D50] border border-[#DFE0E4] rounded-md px-2 py-0.5 bg-white">
                          {inboundTimeRange[1] === 24 ? "23:59" : `${String(inboundTimeRange[1]).padStart(2, "0")}:00`}
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
                        <span className="text-xs text-[#010D50] border border-[#DFE0E4] rounded-md px-2 py-0.5 bg-white">
                          {outboundJourneyTime[0]} Hours
                        </span>
                        <span className="text-xs text-[#010D50] border border-[#DFE0E4] rounded-md px-2 py-0.5 bg-white">
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
                        <span className="text-xs text-[#010D50] border border-[#DFE0E4] rounded-md px-2 py-0.5 bg-white">
                          {inboundJourneyTime[0]} Hours
                        </span>
                        <span className="text-xs text-[#010D50] border border-[#DFE0E4] rounded-md px-2 py-0.5 bg-white">
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
        </SheetContent>
      </Sheet>

      {/* Main Content */}
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 pb-8">
        <div className="flex flex-col lg:flex-row gap-4">
          {/* Filters Sidebar - Hidden on mobile, shown on desktop */}
          <div className="hidden lg:flex w-full lg:w-72 flex-col gap-4 order-3 lg:order-1">
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
                    <span className="text-xs text-[#010D50] border border-[#DFE0E4] rounded-md px-2 py-0.5 bg-white">
                      £{priceRange[0]}
                    </span>
                    <span className="text-xs text-[#010D50] border border-[#DFE0E4] rounded-md px-2 py-0.5 bg-white">
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
                        <span className="text-sm text-[#010D50] border border-[#DFE0E4] rounded-md px-2 py-0.5 bg-white">
                          {String(outboundTimeRange[0]).padStart(2, "0")}:00
                        </span>
                        <span className="text-sm text-[#010D50] border border-[#DFE0E4] rounded-md px-2 py-0.5 bg-white">
                          {outboundTimeRange[1] === 24 ? "23:59" : `${String(outboundTimeRange[1]).padStart(2, "0")}:00`}
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
                        <span className="text-sm text-[#010D50] border border-[#DFE0E4] rounded-md px-2 py-0.5 bg-white">
                          {String(inboundTimeRange[0]).padStart(2, "0")}:00
                        </span>
                        <span className="text-sm text-[#010D50] border border-[#DFE0E4] rounded-md px-2 py-0.5 bg-white">
                          {inboundTimeRange[1] === 24 ? "23:59" : `${String(inboundTimeRange[1]).padStart(2, "0")}:00`}
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
                        <span className="text-xs text-[#010D50] border border-[#DFE0E4] rounded-md px-2 py-0.5 bg-white">
                          {outboundJourneyTime[0]} Hours
                        </span>
                        <span className="text-xs text-[#010D50] border border-[#DFE0E4] rounded-md px-2 py-0.5 bg-white">
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
                        <span className="text-xs text-[#010D50] border border-[#DFE0E4] rounded-md px-2 py-0.5 bg-white">
                          {inboundJourneyTime[0]} Hours
                        </span>
                        <span className="text-xs text-[#010D50] border border-[#DFE0E4] rounded-md px-2 py-0.5 bg-white">
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
          <div className="flex-1 flex flex-col gap-2 order-2 lg:order-2">
            {filteredFlights.map((flight) => (
              <FlightCard key={flight.id} flight={flight} />
            ))}
          </div>

          {/* Right Sidebar - Web Ref and Search Summary */}
          <div className="w-full lg:w-80 flex flex-col gap-4 order-1 lg:order-3">
            {/* Contact Card */}
            <div className="bg-white border border-[#DFE0E4] rounded-xl p-4 flex flex-col gap-3 sticky top-20">
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

