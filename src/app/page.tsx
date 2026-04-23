"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Image from "next/image";
import Navbar from "@/components/navigation/Navbar";
import Footer from "@/components/navigation/Footer";
import SearchBar from "@/components/search/SearchBar";
import { Plane, Loader2, MapPin, Phone, ChevronRight } from "lucide-react";
import { useBookingStore } from "@/store/bookingStore";
import { usePackageDeeplink } from "@/hooks/usePackageDeeplink";
import { useAffiliate, useAffiliatePhone } from "@/lib/AffiliateContext";
import { normalizeCabinClass } from "@/lib/utils";
import type { SearchParams } from "@/types/flight";
import type { Airport } from "@/types/airport";

// Airline logos for the "Why Book With Us" section
const airlineLogos = [
  { name: "Lufthansa", src: "/figma/homepage/lufthansa.svg", width: 100, height: 24 },
  { name: "Emirates", src: "/figma/homepage/emirates.svg", width: 90, height: 24 },
  { name: "Austrian", src: "/figma/homepage/austrian.svg", width: 120, height: 24 },
  { name: "United", src: "/figma/homepage/united.svg", width: 90, height: 24 },
  { name: "Air Canada", src: "/figma/homepage/air-canada.svg", width: 130, height: 24 },
  { name: "Ethiopian", src: "/figma/homepage/ethiopian.svg", width: 110, height: 24 },
];

// Destination cards data
const destinationCards = [
  {
    id: "usa",
    title: "USA Offers",
    description: "A sweeping fusion of scale and spirit—USA delivers soaring city skylines, iconic landmarks, vast landscapes, and flavors shaped by every culture.",
    image: "/figma/homepage/usa-card.jpg",
    theme: "light",
    destinations: [
      { name: "New York, United States", price: "~$403" },
      { name: "Los Angeles, United States", price: "~$457" },
      { name: "Washington, DC, United States", price: "~$559" },
    ],
  },
  {
    id: "asia",
    title: "Asia Offers",
    description: "A vibrant tapestry of cultures and contrasts—Asia blends ancient wisdom, futuristic cities, serene landscapes, and flavors that ignite every sense.",
    image: "/figma/homepage/asia-card.jpg",
    theme: "light",
    destinations: [
      { name: "New Delhi, India", price: "~$489" },
      { name: "Manila, Philippines", price: "~$527" },
      { name: "Hong Kong, Hong Kong", price: "~$1138" },
    ],
  },
  {
    id: "australia",
    title: "Australia Offers",
    description: "A blend of wild beauty and urban charm—Australia offers sunlit beaches, vibrant cities, and unforgettable wildlife.",
    image: "/figma/homepage/australia-card.jpg",
    theme: "light",
    destinations: [
      { name: "Auckland, New Zealand", price: "~$754" },
      { name: "Sydney, Australia", price: "~$818" },
      { name: "Melbourne, Australia", price: "~$843" },
    ],
  },
];

// Featured destination cards
type FeaturedDestination = {
  id: string;
  title: string;
  image: string;
  airportQuery: string;
  preferredAirportCode: string;
  onClick?: () => void;
};

const featuredDestinations: FeaturedDestination[] = [
  {
    id: "new-york",
    title: "New York Flights",
    image: "/figma/homepage/new-york.jpg",
    airportQuery: "New York",
    preferredAirportCode: "JFK",
  },
  {
    id: "johannesburg",
    title: "Johannesburg Flights",
    image: "/figma/homepage/johannesburg.jpg",
    airportQuery: "Johannesburg",
    preferredAirportCode: "JNB",
  },
];

// Flight class deals
type FlightClassDeal = {
  id: "first-class" | "business-class";
  title: string;
  image: string;
  benefits: string[];
  onClick?: () => void;
};

const flightClassDeals: FlightClassDeal[] = [
  {
    id: "first-class",
    title: "First Class Flight Deals",
    image: "/figma/homepage/first-class-cabin.jpg",
    benefits: [
      "Exclusive airport lounges",
      "Lie-flat beds & premium bedding",
      "Gourmet dining & fine wines",
      "Priority boarding & baggage",
    ],
  },
  {
    id: "business-class",
    title: "Business Class Flight Deals",
    image: "/figma/homepage/business-class-cabin.jpg",
    benefits: [
      "Extra legroom & comfort",
      "Priority check-in & boarding",
      "Enhanced meal service",
      "Lounge access worldwide",
    ],
  },
];

function DestinationCard({ card }: { card: typeof destinationCards[0] }) {
  return (
    <div className="group flex flex-col rounded-[18px] border border-[#DFE0E4] overflow-hidden bg-white transition-colors duration-200 hover:bg-black transform-gpu transition-transform hover:scale-[1.02]">
      {/* Image Section */}
      <div className="relative h-[200px] sm:h-[280px] overflow-hidden m-1 rounded-[14px]">
        <Image
          src={card.image}
          alt={card.title}
          fill
          className="object-cover"
        />
        {/* Image pagination dots */}
        <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1">
          <div className="w-3 h-1 bg-white rounded-full" />
          <div className="w-1 h-1 bg-white/40 rounded-full" />
          <div className="w-1 h-1 bg-white/40 rounded-full" />
          <div className="w-1 h-1 bg-white/40 rounded-full" />
          <div className="w-1 h-1 bg-white/40 rounded-full" />
        </div>
      </div>
      
      {/* Content Section */}
      <div className="p-4 flex flex-col gap-3">
        <h3 className="text-xl font-bold text-[#010D50] transition-colors group-hover:text-white">
          {card.title}
        </h3>
        <p className="text-sm leading-relaxed text-[#3A478A] transition-colors group-hover:text-white/80">
          {card.description}
        </p>
        
        {/* Divider */}
        <div className="h-px bg-[#DFE0E4] transition-colors group-hover:bg-white/20" />
        
        {/* Destinations List */}
        <div className="flex flex-col gap-2">
          {card.destinations.map((dest, idx) => (
            <div
              key={idx}
              className="flex items-center justify-between px-3 py-2 rounded-xl bg-white transition-colors group-hover:bg-[#323232]"
            >
              <div className="flex items-center gap-2">
                <MapPin className="w-5 h-5 text-[#3754ED] transition-colors group-hover:text-white/70" />
                <span className="text-sm font-medium text-[#010D50] transition-colors group-hover:text-white">
                  {dest.name}
                </span>
              </div>
              <span className="text-sm font-medium text-[#010D50] transition-colors group-hover:text-white">
                {dest.price}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function FeaturedDestinationCard({ destination }: { destination: FeaturedDestination }) {
  return (
    <div className="flex flex-col rounded-[18px] overflow-hidden border border-[#DFE0E4] bg-white">
      <div className="relative h-[280px] sm:h-[340px]">
        <Image
          src={destination.image}
          alt={destination.title}
          fill
          className="object-cover"
        />
      </div>
      <div className="p-4 flex items-center justify-between bg-white">
        <h3 className="text-lg sm:text-xl font-bold text-[#010D50]">{destination.title}</h3>
        <button
          type="button"
          onClick={destination.onClick}
          className="flex items-center gap-1 bg-[#3754ED] text-white px-4 py-2 rounded-full text-sm font-medium hover:bg-[#2942D1] transition-colors"
        >
          Explore
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}

function FlightClassDealCard({ deal }: { deal: FlightClassDeal }) {
  return (
    <div className="relative rounded-[18px] overflow-hidden group h-[280px] sm:h-[320px]">
      <Image
        src={deal.image}
        alt={deal.title}
        fill
        className="object-cover"
      />
      {/* Benefits overlay */}
      <div className="absolute top-4 left-4 bg-white/90 backdrop-blur-sm rounded-xl p-4 max-w-[200px]">
        <p className="text-[#010D50] font-semibold text-sm mb-2">Benefits:</p>
        <ul className="space-y-1">
          {deal.benefits.map((benefit, idx) => (
            <li key={idx} className="text-[#3A478A] text-xs flex items-start gap-1">
              <span className="text-[#3754ED] mt-0.5">•</span>
              {benefit}
            </li>
          ))}
        </ul>
      </div>
      {/* CTA Button */}
      <button
        type="button"
        onClick={deal.onClick}
        className="absolute bottom-4 right-4 flex items-center gap-1 bg-[#010D50] text-white px-4 py-2 rounded-full text-sm font-medium hover:bg-[#0B229E] transition-colors"
      >
        {deal.title}
        <ChevronRight className="w-4 h-4" />
      </button>
    </div>
  );
}

function HomeContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { setAffiliateCode } = useAffiliate();
  const { phoneNumber } = useAffiliatePhone();
  const setSelectedFlight = useBookingStore((state) => state.setSelectedFlight);
  const setSearchParams = useBookingStore((state) => state.setSearchParams);
  const setAffiliateData = useBookingStore((state) => state.setAffiliateData);
  const setIsFromDeeplink = useBookingStore((state) => state.setIsFromDeeplink);
  const setSearchRequestId = useBookingStore((state) => state.setSearchRequestId);
  const searchFormState = useBookingStore((state) => state.searchParams);
  const searchSectionRef = useRef<HTMLElement | null>(null);

  const [isLoadingDeeplink, setIsLoadingDeeplink] = useState(false);
  usePackageDeeplink();

  const getBaseSearchParams = (): SearchParams => ({
    from: searchFormState?.from || "",
    to: searchFormState?.to || "",
    departureDate: searchFormState?.departureDate || new Date(),
    returnDate: searchFormState?.returnDate,
    passengers: searchFormState?.passengers || { adults: 1, children: 0, infants: 0 },
    class: searchFormState?.class || "Economy",
    tripType: searchFormState?.tripType || "round-trip",
    segments: searchFormState?.segments,
  });

  const scrollToSearch = () => {
    searchSectionRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const handleSelectClass = (travelClass: SearchParams["class"]) => {
    const current = getBaseSearchParams();
    setSearchParams({
      ...current,
      class: travelClass,
    });
    scrollToSearch();
  };

  const handleSelectDestination = async (query: string, preferredCode: string) => {
    let selectedAirportCode = preferredCode;

    try {
      const response = await fetch(`/api/airports?q=${encodeURIComponent(query)}`);
      if (response.ok) {
        const airports = (await response.json()) as Airport[];
        if (airports.length > 0) {
          const exactCodeMatch = airports.find(
            (airport) => airport.code.toUpperCase() === preferredCode.toUpperCase()
          );
          const firstMatch = exactCodeMatch || airports[0];
          if (firstMatch?.code) {
            selectedAirportCode = firstMatch.code;
          }
        }
      }
    } catch (error) {
      console.error("Failed to fetch destination airports:", error);
    }

    const current = getBaseSearchParams();
    setSearchParams({
      ...current,
      to: selectedAirportCode,
    });
    scrollToSearch();
  };

  const featuredDestinationsWithAction = featuredDestinations.map((destination) => ({
    ...destination,
    onClick: () => {
      void handleSelectDestination(destination.airportQuery, destination.preferredAirportCode);
    },
  }));

  const classDealsWithAction = flightClassDeals.map((deal) => ({
    ...deal,
    onClick: () => handleSelectClass(deal.id === "first-class" ? "First" : "Business"),
  }));

  // Check for deeplink params and handle meta channel URLs (Skyscanner)
  useEffect(() => {
    const key = searchParams.get("key");
    const utmSource = searchParams.get("utm_source");
    const utmMedium = searchParams.get("utm_medium");
    const utmCampaign = searchParams.get("utm_campaign");
    const cnc = searchParams.get("cnc");

    // If no key, this is not a deeplink - show normal home page
    if (!key) return;

    // Handle deeplink flow
    async function processDeeplink() {
      setIsLoadingDeeplink(true);

      // Mark this as a deeplink flow
      setIsFromDeeplink(true);

      // Store affiliate/tracking data with full UTM params
      if (utmSource) {
        setAffiliateCode(utmSource);
        setAffiliateData({
          code: utmSource,
          utmSource: utmSource,
          utmMedium: utmMedium || undefined,
          utmCampaign: utmCampaign || undefined,
          cnc: cnc || undefined,
        });

        // Store in sessionStorage for persistence across page loads
        if (typeof window !== "undefined") {
          sessionStorage.setItem("utm_source", utmSource);
          if (utmMedium) sessionStorage.setItem("utm_medium", utmMedium);
          if (utmCampaign) sessionStorage.setItem("utm_campaign", utmCampaign);
          if (cnc) sessionStorage.setItem("cnc", cnc);
        }
      }

      try {
        // Call FlightView API to get flight details
        const response = await fetch("/api/flight-view", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ key }),
        });

        const data = await response.json();

        if (!response.ok || !data.success) {
          console.error("FlightView API error:", data);
          // On error, redirect to search with error message
          router.push("/search?error=flight_unavailable");
          return;
        }

        // Store flight and search params in booking store
        if (data.flight) {
          // Store the flight key for later use
          const flightWithKey = {
            ...data.flight,
            flightKey: key,
          };
          setSelectedFlight(flightWithKey, normalizeCabinClass(data.flight.outbound?.cabinClass));
        }

        if (data.searchParams) {
          // Convert date strings back to Date objects
          const params = {
            ...data.searchParams,
            departureDate: new Date(data.searchParams.departureDate),
            returnDate: data.searchParams.returnDate
              ? new Date(data.searchParams.returnDate)
              : undefined,
          };
          setSearchParams(params);
        }

        // Store the request ID as web ref (from FlightView response)
        if (data.requestId) {
          setSearchRequestId(data.requestId);
        }

        // Redirect directly to booking page
        router.push("/booking");
      } catch (error) {
        console.error("Deeplink processing error:", error);
        router.push("/search?error=flight_unavailable");
      }
    }

    processDeeplink();
  }, [searchParams, router, setAffiliateCode, setSelectedFlight, setSearchParams, setAffiliateData, setIsFromDeeplink, setSearchRequestId]);

  // Show loading state when processing deeplink
  if (isLoadingDeeplink) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white">
        <Navbar />
        <div className="flex flex-col items-center justify-center min-h-[60vh] px-4">
          <div className="bg-white rounded-2xl shadow-lg p-8 max-w-md w-full text-center">
            <div className="relative mb-6">
              <div className="w-20 h-20 mx-auto bg-[rgba(55,84,237,0.1)] rounded-full flex items-center justify-center">
                <Plane className="w-10 h-10 text-[#3754ED] animate-pulse" />
              </div>
              <div className="absolute inset-0 flex items-center justify-center">
                <Loader2 className="w-24 h-24 text-[#3754ED]/20 animate-spin" />
              </div>
            </div>
            <h1 className="text-2xl font-bold text-[#010D50] mb-3">
              Loading Your Flight
            </h1>
            <p className="text-[#3A478A]">
              Please wait while we retrieve your selected flight details...
            </p>
            <div className="mt-6 flex justify-center gap-1">
              <span className="w-2 h-2 bg-[#3754ED] rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
              <span className="w-2 h-2 bg-[#3754ED] rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
              <span className="w-2 h-2 bg-[#3754ED] rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      <Navbar />
      
      {/* Hero Section with Background Image */}
      <section ref={searchSectionRef} className="relative min-h-[500px] sm:min-h-[600px] lg:min-h-[700px] flex items-center justify-center">
        {/* Background Image */}
        <div className="absolute inset-0 z-0">
          <Image
            src="/figma/homepage/hero-bg.jpg"
            alt="Beautiful mountain landscape"
            fill
            className="object-cover"
            priority
          />
          <div className="absolute inset-0 bg-black/30" />
        </div>
        
        {/* Search Bar Container */}
        <div className="relative z-10 w-full max-w-[1564px] mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <SearchBar />
        </div>
        
        {/* Location Badge */}
        <div className="absolute bottom-6 right-6 z-10 hidden sm:flex items-center gap-2 bg-black/40 backdrop-blur-sm text-white px-4 py-2 rounded-full">
          <MapPin className="w-5 h-5" />
          <span className="text-sm font-medium">Ciucaș Peak, Romania</span>
        </div>
      </section>

      {/* Why Book With Us Section */}
      <section className="py-12 sm:py-16 bg-white">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-8">
            <h2 className="text-2xl sm:text-3xl font-semibold text-[#010D50] mb-2">
              Why Book With Us?
            </h2>
            <p className="text-sm text-[#3A478A]">
              Book cheap flights over 100 of the World&apos;s leading Airlines...
            </p>
          </div>
          
          {/* Airline Logos */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            {airlineLogos.map((logo) => (
              <div
                key={logo.name}
                className="flex items-center justify-center p-4 sm:p-6 bg-white border border-[#DFE0E4] rounded-2xl shadow-[0px_2px_8px_0px_rgba(0,0,0,0.12)] hover:shadow-md transition-shadow min-h-[72px]"
              >
                <Image
                  src={logo.src}
                  alt={logo.name}
                  width={logo.width}
                  height={logo.height}
                  className={`h-5 sm:h-6 w-auto object-contain max-w-full ${logo.name === "Lufthansa" ? "rotate-180 -scale-x-100" : ""}`}
                />
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Compare Cheap Flights Section */}
      <section className="py-12 sm:py-16 bg-white">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-10">
            <h2 className="text-2xl sm:text-3xl font-semibold text-[#010D50] mb-2">
              Compare Cheap Flights To Worldwide Destinations
            </h2>
            <p className="text-sm text-[#3A478A]">
              Find the best deals, compare prices instantly, and book your next adventure with ease
            </p>
          </div>
          
          {/* Destination Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {destinationCards.map((card) => (
              <DestinationCard key={card.id} card={card} />
            ))}
          </div>
        </div>
      </section>

      {/* First Class & Business Class Flight Deals Section */}
      <section className="py-12 sm:py-16 bg-white">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {classDealsWithAction.map((deal) => (
              <FlightClassDealCard key={deal.id} deal={deal} />
            ))}
          </div>
        </div>
      </section>

      {/* Great Deals Section */}
      <section className="py-12 sm:py-16 bg-white">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-10">
            <h2 className="text-2xl sm:text-3xl font-semibold text-[#010D50] mb-3">
              Great deals on flights and more from Globehunters
            </h2>
            <p className="text-sm text-[#3A478A] max-w-4xl mx-auto leading-relaxed">
              Compare cheap flights to worldwide destinations over the phone or online! Call us now to speak to our experienced and helpful flight experts for tailor made itineraries and personalised quotes. We&apos;ll even aim to price match any flight offers you may have received elsewhere! Take a look at our amazing flight deals and book now!
            </p>
          </div>
          
          {/* Featured Destination Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {featuredDestinationsWithAction.map((dest) => (
              <FeaturedDestinationCard key={dest.id} destination={dest} />
            ))}
          </div>
        </div>
      </section>

      {/* Call Now Save Big Section */}
      <section className="py-12 sm:py-16 bg-white">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Full-width container with background image */}
          <div 
            className="relative rounded-[24px] overflow-hidden min-h-[400px] sm:min-h-[450px] flex items-center"
            style={{
              backgroundImage: 'url(/woman.png)',
              backgroundSize: 'cover',
              backgroundPosition: 'left center',
            }}
          >
            {/* Call CTA Card - Positioned on the right */}
            <div className="ml-auto mr-4 sm:mr-8 lg:mr-12 w-[90%] sm:w-[400px] lg:w-[420px] bg-white rounded-[24px] p-6 sm:p-8 shadow-xl">
              <h2 className="text-2xl sm:text-3xl font-bold text-[#010D50] mb-6 text-center">
                CALL NOW SAVE BIG
              </h2>
              
              {/* Phone CTA */}
              <a
                href={`tel:${phoneNumber.replace(/\s/g, '')}`}
                className="flex items-center gap-3 bg-gradient-to-r from-[#0B229E] to-[#3754ED] rounded-full px-5 py-3 mb-4 hover:opacity-90 transition-opacity w-full justify-center"
              >
                <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center flex-shrink-0">
                  <Phone className="w-5 h-5 text-[#0B229E]" />
                </div>
                <div className="text-left">
                  <p className="text-white/80 text-[10px]">24/7 Toll-Free</p>
                  <p className="text-white text-xl font-bold">{phoneNumber}</p>
                </div>
              </a>
              
              <p className="text-[#3754ED] text-sm text-center italic mb-6">
                Call to unlock unlisted fares & personalized offers!
              </p>
              
              <div className="text-center">
                <p className="text-[#010D50] text-base mb-1">
                  Not all deals are online. Get in touch for exclusive
                </p>
                <p className="text-2xl sm:text-3xl font-bold text-[#FF6B35]">
                  Discount Offers
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}

export default function Home() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white flex items-center justify-center">
          <Loader2 className="w-12 h-12 text-[#3754ED] animate-spin" />
        </div>
      }
    >
      <HomeContent />
    </Suspense>
  );
}
