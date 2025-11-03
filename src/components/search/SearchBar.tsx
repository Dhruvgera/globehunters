"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  MapPin,
  Calendar,
  Users,
  Search,
  ArrowLeftRight,
  ChevronDown,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { format } from "date-fns";

interface SearchBarProps {
  compact?: boolean;
}

export default function SearchBar({ compact = false }: SearchBarProps) {
  const router = useRouter();
  const [tripType, setTripType] = useState<"round-trip" | "one-way" | "multi-city">(
    "round-trip"
  );
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [departureDate, setDepartureDate] = useState<Date>();
  const [returnDate, setReturnDate] = useState<Date>();
  const [dateRange, setDateRange] = useState<{ from?: Date; to?: Date }>({});
  const [passengers, setPassengers] = useState({
    adults: 1,
    children: 0,
    infants: 0,
  });
  const [travelClass, setTravelClass] = useState("Economy");

  const handleSearch = () => {
    const params = new URLSearchParams({
      from,
      to,
      departureDate: (dateRange.from || departureDate)?.toISOString() || "",
      returnDate: (dateRange.to || returnDate)?.toISOString() || "",
      adults: passengers.adults.toString(),
      children: passengers.children.toString(),
      infants: passengers.infants.toString(),
      class: travelClass,
      tripType,
    });

    router.push(`/search?${params.toString()}`);
  };

  const totalPassengers =
    passengers.adults + passengers.children + passengers.infants;

  return (
    <div
      className={`w-full bg-white rounded-[24px] ${
        compact ? "p-3 shadow-sm" : "p-5 border border-[#DFE0E4] shadow-md"
      }`}
    >
      {/* Top Row - Trip Type and Passengers */}
      <div className="flex flex-wrap items-center gap-4 sm:gap-6 mb-4">
        {/* Trip Type Selector */}
        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant="ghost"
              className="flex items-center gap-2 rounded-[40px] px-0 hover:bg-transparent h-auto"
            >
              <ArrowLeftRight className="w-5 h-5 text-[#010D50]" />
              <span className="text-sm font-medium text-[#010D50]">
                {tripType === "round-trip" ? "Round Trip" : tripType === "one-way" ? "One Way" : "Multi City"}
              </span>
              <ChevronDown className="w-5 h-5 text-[#010D50]" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-48">
            <div className="flex flex-col gap-2">
              <Button
                variant="ghost"
                className="justify-start"
                onClick={() => setTripType("round-trip")}
              >
                Round Trip
              </Button>
              <Button
                variant="ghost"
                className="justify-start"
                onClick={() => setTripType("one-way")}
              >
                One Way
              </Button>
              <Button
                variant="ghost"
                className="justify-start"
                onClick={() => setTripType("multi-city")}
              >
                Multi City
              </Button>
            </div>
          </PopoverContent>
        </Popover>

        {/* Passengers Selector */}
        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant="ghost"
              className="flex items-center gap-2 rounded-[40px] px-0 hover:bg-transparent h-auto"
            >
              <Users className="w-5 h-5 text-[#010D50]" />
              <span className="text-sm font-medium text-[#010D50]">
                {totalPassengers} Adult{totalPassengers > 1 ? "s" : ""},{" "}
                {travelClass}
              </span>
              <ChevronDown className="w-5 h-5 text-[#010D50]" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-80">
            <div className="flex flex-col gap-4">
              {/* Adults */}
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Adults</span>
                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() =>
                      setPassengers((p) => ({
                        ...p,
                        adults: Math.max(1, p.adults - 1),
                      }))
                    }
                  >
                    -
                  </Button>
                  <span className="w-8 text-center">{passengers.adults}</span>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() =>
                      setPassengers((p) => ({ ...p, adults: p.adults + 1 }))
                    }
                  >
                    +
                  </Button>
                </div>
              </div>

              {/* Children */}
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Children (2-11)</span>
                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() =>
                      setPassengers((p) => ({
                        ...p,
                        children: Math.max(0, p.children - 1),
                      }))
                    }
                  >
                    -
                  </Button>
                  <span className="w-8 text-center">{passengers.children}</span>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() =>
                      setPassengers((p) => ({ ...p, children: p.children + 1 }))
                    }
                  >
                    +
                  </Button>
                </div>
              </div>

              {/* Infants */}
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Infants (&lt;2)</span>
                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() =>
                      setPassengers((p) => ({
                        ...p,
                        infants: Math.max(0, p.infants - 1),
                      }))
                    }
                  >
                    -
                  </Button>
                  <span className="w-8 text-center">{passengers.infants}</span>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() =>
                      setPassengers((p) => ({ ...p, infants: p.infants + 1 }))
                    }
                  >
                    +
                  </Button>
                </div>
              </div>

              {/* Travel Class */}
              <div className="border-t pt-4">
                <p className="text-sm font-medium mb-2">Travel Class</p>
                <div className="flex flex-col gap-2">
                  {["Economy", "Premium Economy", "Business", "First"].map(
                    (cls) => (
                      <Button
                        key={cls}
                        variant={travelClass === cls ? "default" : "ghost"}
                        className="justify-start"
                        onClick={() => setTravelClass(cls)}
                      >
                        {cls}
                      </Button>
                    )
                  )}
                </div>
              </div>
            </div>
          </PopoverContent>
        </Popover>
      </div>

      {/* Main Search Row */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center gap-3">
        {/* From */}
        <div className="flex items-center gap-2 flex-1 border border-[#D3D3D3] rounded-xl px-3 py-2.5 bg-white">
          <MapPin className="w-5 h-5 text-[#010D50]" />
          <input
            type="text"
            placeholder="Country, city or airport"
            value={from}
            onChange={(e) => setFrom(e.target.value)}
            className="flex-1 outline-none text-sm font-medium text-[#010D50] placeholder:text-gray-400"
          />
        </div>

        {/* Swap Button */}
        <Button
          variant="ghost"
          size="icon"
          className="rounded-full shrink-0 h-8 w-8 self-center md:self-auto -my-1 md:my-0 border border-[#D3D3D3] bg-white shadow-sm"
          onClick={() => {
            const temp = from;
            setFrom(to);
            setTo(temp);
          }}
        >
          <ArrowLeftRight className="w-5 h-5 text-[#010D50]" />
        </Button>

        {/* To */}
        <div className="flex items-center gap-2 flex-1 border border-[#D3D3D3] rounded-xl px-3 py-2.5 bg-white">
          <MapPin className="w-5 h-5 text-[#010D50]" />
          <input
            type="text"
            placeholder="Country, city or airport"
            value={to}
            onChange={(e) => setTo(e.target.value)}
            className="flex-1 outline-none text-sm font-medium text-[#010D50] placeholder:text-gray-400"
          />
        </div>

        {/* Unified Date Picker for Round Trip */}
        {tripType === "round-trip" ? (
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className="flex items-center gap-2 flex-1 border-[#D3D3D3] rounded-xl px-3 py-2.5 h-auto justify-start hover:bg-transparent hover:border-[#D3D3D3]"
              >
                <Calendar className="w-5 h-5 text-[#010D50]" />
                <span className="text-sm font-medium text-[#010D50]">
                  {dateRange.from ? (
                    dateRange.to ? (
                      `${format(dateRange.from, "dd MMM")} - ${format(dateRange.to, "dd MMM yyyy")}`
                    ) : (
                      format(dateRange.from, "EEE, dd MMM yyyy")
                    )
                  ) : (
                    "Departure - Return Date"
                  )}
                </span>
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-3 sm:p-4 bg-white border shadow-md" align="start">
              <CalendarComponent
                mode="range"
                selected={dateRange as any}
                onSelect={(range: any) => setDateRange(range || {})}
                initialFocus
                numberOfMonths={2}
                className="text-sm [--cell-size:2rem] sm:[--cell-size:2.25rem] lg:[--cell-size:2.5rem]"
              />
            </PopoverContent>
          </Popover>
        ) : (
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className="flex items-center gap-2 flex-1 border-[#D3D3D3] rounded-xl px-3 py-2.5 h-auto justify-start hover:bg-transparent hover:border-[#D3D3D3]"
              >
                <Calendar className="w-5 h-5 text-[#010D50]" />
                <span className="text-sm font-medium text-[#010D50]">
                  {departureDate
                    ? format(departureDate, "EEE, dd MMM yyyy")
                    : "Departure Date"}
                </span>
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-3 sm:p-4 bg-white border shadow-md" align="start">
              <CalendarComponent
                mode="single"
                selected={departureDate}
                onSelect={setDepartureDate}
                initialFocus
                className="text-sm [--cell-size:2rem] sm:[--cell-size:2.25rem] lg:[--cell-size:2.5rem]"
              />
            </PopoverContent>
          </Popover>
        )}

        {/* Search Button */}
        <Button
          onClick={handleSearch}
          className="bg-[#3754ED] hover:bg-[#2A3FB8] text-white rounded-xl px-5 py-2.5 h-auto gap-2 text-sm font-medium w-full md:w-auto"
        >
          <Search className="w-5 h-5" />
          Search
        </Button>
      </div>
    </div>
  );
}

