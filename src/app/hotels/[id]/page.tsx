"use client";

import { useState, useRef } from "react";
import Image from "next/image";
import Link from "next/link";
import { useParams } from "next/navigation";
import {
  ChevronRight,
  ChevronUp,
  ChevronDown,
  MapPin,
  Star,
  Grid3X3,
  Phone,
  Building2,
  Calendar,
  Users,
  SlidersHorizontal,
  Search,
  Wifi,
  Maximize,
  Users as UsersIcon,
  Bed,
  Trees,
  Building,
  PawPrint,
  Bus,
  Dumbbell,
  Sparkles,
  Wind,
  Bath,
  CreditCard,
  X,
} from "lucide-react";

import Navbar from "@/components/navigation/Navbar";
import Footer from "@/components/navigation/Footer";
import { Button } from "@/components/ui/button";
import {
  mockHotelDetails,
  mockHotelRooms,
  mockHotelReviews,
  mockHotelFAQs,
} from "@/data/mockHotelDetails";

// Icon mapping for amenities
const amenityIcons: Record<string, React.ComponentType<{ className?: string }>> = {
  pets: PawPrint,
  shuttle: Bus,
  gym: Dumbbell,
  spa: Sparkles,
  ac: Wind,
  hot_tub: Bath,
  pool: Bath,
  wifi: Wifi,
  restaurant: Building,
  parking: Building,
  fullscreen: Maximize,
  group: UsersIcon,
  bed: Bed,
  nature: Trees,
  city: Building,
  bathtub: Bath,
  kitchen: Building,
};

function getAmenityIcon(iconName: string) {
  const Icon = amenityIcons[iconName];
  return Icon ? <Icon className="w-[18px] h-[18px] text-[#010D50]" /> : null;
}

// Navigation sections
const navSections = ["Overview", "About", "Rooms", "Accessibilities", "Policies"];

export default function HotelRoomsPage() {
  const params = useParams();
  const hotelId = params?.id as string;
  
  // State
  const [expandedFAQ, setExpandedFAQ] = useState<string | null>(mockHotelFAQs[0]?.id || null);
  const [showAllAmenities, setShowAllAmenities] = useState(false);
  const [activeSection, setActiveSection] = useState("Overview");

  // Refs for sections
  const overviewRef = useRef<HTMLDivElement>(null);
  const aboutRef = useRef<HTMLDivElement>(null);
  const roomsRef = useRef<HTMLDivElement>(null);
  const reviewsRef = useRef<HTMLDivElement>(null);

  // Use mock data (in real app, fetch based on hotelId)
  const hotel = mockHotelDetails;
  const rooms = mockHotelRooms;
  const reviews = mockHotelReviews;
  const faqs = mockHotelFAQs;

  const displayedAmenities = showAllAmenities ? hotel.amenities : hotel.amenities.slice(0, 6);

  const scrollToSection = (section: string) => {
    setActiveSection(section);
    const refs: Record<string, React.RefObject<HTMLDivElement | null>> = {
      Overview: overviewRef,
      About: aboutRef,
      Rooms: roomsRef,
    };
    refs[section]?.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  return (
    <div className="min-h-screen bg-white">
      <Navbar />

      {/* Sticky Navigation Bar */}
      <div className="sticky top-[73px] z-40 bg-white shadow-sm border-b border-[#DFE0E4]">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-3">
          <div className="flex items-center gap-4 overflow-x-auto">
            {/* Back to Search */}
            <button
              onClick={() => window.history.back()}
              className="flex items-center gap-2 px-4 py-2 rounded-full bg-[#F6F6F6] text-sm font-medium text-[#010D50] whitespace-nowrap hover:bg-gray-200 transition-colors"
            >
              <ChevronUp className="w-4 h-4 rotate-[-90deg]" />
              Back to search results
            </button>

            {/* Section Tabs */}
            <div className="flex items-center gap-3">
              {navSections.map((section) => (
                <button
                  key={section}
                  onClick={() => scrollToSection(section)}
                  className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${
                    activeSection === section
                      ? "border border-[#DFE0E4] text-[#010D50]"
                      : "text-[#010D50] hover:bg-gray-100"
                  }`}
                >
                  {section}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white rounded-3xl overflow-hidden">
          {/* Overview Section */}
          <div ref={overviewRef}>
            {/* Hotel Header + Gallery */}
            <div className="p-4 lg:p-6 space-y-6">
              {/* Hotel Name & Address */}
              <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
                <div className="flex-1 space-y-2">
                  <h1 className="text-2xl lg:text-[32px] font-semibold text-[#010D50] leading-tight">
                    {hotel.name}
                  </h1>
                  <p className="text-base lg:text-lg text-[#3A478A]">{hotel.address}</p>
                  {/* Star Rating */}
                  <div className="flex items-center gap-1 py-1.5">
                    {Array.from({ length: hotel.starRating }).map((_, i) => (
                      <Star key={i} className="w-5 h-5 fill-yellow-400 text-yellow-400" />
                    ))}
                  </div>
                </div>
              </div>

              {/* Image Gallery - Main image left, 3 thumbnails stacked right */}
              <div className="flex flex-col lg:flex-row gap-3">
                {/* Main Image - Takes up ~70% width */}
                <div className="relative flex-[2] min-h-[300px] lg:min-h-[450px] rounded-2xl overflow-hidden">
                  <Image
                    src={hotel.mainImage}
                    alt={hotel.name}
                    fill
                    className="object-cover"
                    priority
                  />
                  {/* Show All Photos Button - Bottom left of main image */}
                  <button className="absolute bottom-4 left-4 flex items-center gap-2 px-4 py-2 rounded-lg bg-white/90 backdrop-blur-sm hover:bg-white transition-colors">
                    <Grid3X3 className="w-4 h-4 text-[#010D50]" />
                    <span className="text-sm font-medium text-[#010D50]">Show All Photos</span>
                  </button>
                </div>

                {/* Thumbnail Stack - 3 images vertically on right */}
                <div className="flex flex-row lg:flex-col gap-3 lg:w-[220px]">
                  {hotel.galleryImages.slice(0, 3).map((img, idx) => (
                    <div
                      key={idx}
                      className="relative flex-1 lg:flex-none lg:h-[140px] min-h-[100px] rounded-xl overflow-hidden"
                    >
                      <Image
                        src={img}
                        alt={`${hotel.name} - ${idx + 1}`}
                        fill
                        className="object-cover"
                      />
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Content Grid */}
          <div className="p-4 lg:p-6 space-y-8">
            <div className="grid lg:grid-cols-[1fr_380px] gap-8">
              {/* Left Column - About & Amenities */}
              <div ref={aboutRef} className="space-y-8">
                {/* About Section */}
                <div className="space-y-4 pb-6 border-b border-[#DFE0E4]">
                  <h2 className="text-xl lg:text-2xl font-semibold text-[#010D50]">
                    About this property
                  </h2>
                  <div className="text-sm text-[#3A478A] leading-relaxed whitespace-pre-line">
                    {hotel.about.description}
                  </div>
                </div>

                {/* Amenities Section */}
                <div className="space-y-4">
                  <h2 className="text-xl lg:text-2xl font-semibold text-[#010D50]">
                    Amenities
                  </h2>
                  <div className="flex flex-wrap gap-3">
                    {displayedAmenities.map((amenity) => (
                      <div
                        key={amenity.label}
                        className="flex items-center gap-2 px-4 py-3 border border-[#DFE0E4] rounded-xl"
                      >
                        {getAmenityIcon(amenity.icon)}
                        <span className="text-sm text-[#010D50]">{amenity.label}</span>
                      </div>
                    ))}
                  </div>
                  {hotel.amenities.length > 6 && (
                    <button
                      onClick={() => setShowAllAmenities(!showAllAmenities)}
                      className="text-sm font-medium text-[#3754ED] hover:underline"
                    >
                      {showAllAmenities ? "Show less" : "Show more"}
                    </button>
                  )}
                </div>
              </div>

              {/* Right Column - Reviews Card & Map */}
              <div className="space-y-4">
                {/* Reviews Summary Card */}
                <div className="border border-[#DFE0E4] rounded-2xl p-6 space-y-6">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xl font-semibold text-[#010D50]">Reviews</h3>
                  </div>

                  <div className="flex items-center gap-2">
                    <div className="flex flex-col items-end gap-1">
                      <span className="text-sm font-medium text-[#010D50]">
                        {hotel.reviews.label}
                      </span>
                      <span className="text-xs text-[#010D50]">
                        {hotel.reviews.count} reviews
                      </span>
                    </div>
                    <div className="w-12 h-12 rounded-xl bg-[#008234] text-white flex items-center justify-center font-medium text-sm">
                      {hotel.reviews.score.toFixed(1)}
                    </div>
                  </div>

                  {/* Featured Review */}
                  <div className="bg-[#F5F7FF] rounded-xl p-4 space-y-3">
                    <p className="text-sm text-[#010D50] leading-relaxed">
                      Great location and view. Check-out was easy and they even had water and tea available. Would stay again
                    </p>
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-full bg-gray-300" />
                      <span className="text-sm font-medium text-[#010D50]">Sarah M.</span>
                    </div>
                  </div>
                </div>

                {/* Map Card */}
                <div className="border border-[#DFE0E4] rounded-2xl overflow-hidden">
                  <div className="relative aspect-[4/3] bg-gray-200">
                    <Image
                      src="/figma/hotels/hotel-card-image.png"
                      alt="Map"
                      fill
                      className="object-cover opacity-60"
                    />
                    <div className="absolute inset-0 flex items-end p-6">
                      <Link
                        href={hotel.mapUrl}
                        target="_blank"
                        className="flex items-center gap-2 px-5 py-3 rounded-full bg-[#3754ED] text-white text-sm font-bold hover:bg-[#2A3FB8] transition-colors"
                      >
                        View on map
                        <ChevronRight className="w-5 h-5" />
                      </Link>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Availability / Rooms Section */}
          <div ref={roomsRef} className="border border-[#DFE0E4] rounded-3xl mx-4 lg:mx-6 mb-6">
            {/* Search Bar */}
            <div className="p-6 lg:p-8 border-b border-[#DFE0E4] space-y-6">
              <h2 className="text-xl lg:text-2xl font-semibold text-[#010D50]">
                Availability
              </h2>

              <div className="flex flex-wrap items-center gap-4">
                {/* Hotel Name Input */}
                <div className="flex items-center gap-2 px-4 py-3 border border-[#DFE0E4] rounded-2xl flex-1 min-w-[200px]">
                  <Building2 className="w-[18px] h-[18px] text-[#3A478A]" />
                  <span className="text-sm font-medium text-[#010D50] truncate">
                    {hotel.name}
                  </span>
                </div>

                {/* Date Selector */}
                <div className="flex items-center gap-2 px-4 py-3 border border-[#DFE0E4] rounded-2xl min-w-[150px]">
                  <Calendar className="w-[18px] h-[18px] text-[#3A478A]" />
                  <span className="text-sm font-medium text-[#010D50]">Add Date</span>
                </div>

                {/* Guests */}
                <div className="flex items-center gap-2 px-4 py-3 border border-[#DFE0E4] rounded-2xl min-w-[150px]">
                  <Users className="w-[18px] h-[18px] text-[#3A478A]" />
                  <span className="text-sm font-medium text-[#010D50]">2 Guests, 1 Room</span>
                </div>

                {/* Filters Button */}
                <Button
                  variant="default"
                  className="flex items-center gap-2 px-5 py-3 h-auto rounded-full bg-[#3754ED] hover:bg-[#2A3FB8] text-white"
                >
                  <SlidersHorizontal className="w-[18px] h-[18px]" />
                  <span className="text-sm font-medium">Filters</span>
                </Button>

                {/* Search Button */}
                <Button
                  variant="default"
                  className="flex items-center gap-2 px-6 py-3 h-auto rounded-full bg-[#3754ED] hover:bg-[#2A3FB8] text-white font-bold"
                >
                  Search
                </Button>
              </div>
            </div>

            {/* Room Cards Grid */}
            <div className="p-6 lg:p-8 space-y-8">
              <div className="grid lg:grid-cols-3 gap-6">
                {rooms.map((room) => (
                  <div
                    key={room.id}
                    className="border border-[#DFE0E4] rounded-[32px] bg-white p-6 flex flex-col h-full"
                  >
                    {/* Room Info */}
                    <div className="flex-1 space-y-4">
                      {/* Room Name & Bed Type */}
                      <div className="space-y-2">
                        <h3 className="text-lg font-semibold text-[#010D50]">
                          {room.name}
                        </h3>
                        <p className="text-sm text-[#3A478A]">{room.bedType}</p>
                      </div>

                      {/* Rating */}
                      <div className="flex items-center gap-2">
                        <div className="w-10 h-10 rounded-xl bg-[#008234] text-white flex items-center justify-center font-medium text-sm">
                          {room.reviews.score.toFixed(1)}
                        </div>
                        <div className="flex flex-col">
                          <span className="text-sm font-medium text-[#010D50]">
                            {room.reviews.label}
                          </span>
                          <span className="text-xs text-[#010D50]">
                            {room.reviews.count} reviews
                          </span>
                        </div>
                      </div>

                      {/* Refund & Payment Tags */}
                      <div className="flex flex-wrap gap-2">
                        <div className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs ${
                          room.isRefundable 
                            ? "bg-green-100 text-green-700" 
                            : "bg-[rgba(0,0,0,0.08)] text-[#FF1414]"
                        }`}>
                          <X className="w-3.5 h-3.5" />
                          {room.isRefundable ? "Refundable" : "Non-refundable"}
                        </div>
                        <div className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-[rgba(0,0,0,0.08)] text-xs text-[#010D50]">
                          <CreditCard className="w-3.5 h-3.5" />
                          {room.paymentType}
                        </div>
                      </div>

                      {/* Room Amenities */}
                      <div className="flex flex-wrap gap-2">
                        {room.amenities.slice(0, 5).map((amenity) => (
                          <div
                            key={amenity.label}
                            className="flex items-center gap-1.5 px-2 py-1 border border-[#DFE0E4] rounded-xl"
                          >
                            {getAmenityIcon(amenity.icon) || (
                              <div className="w-3.5 h-3.5 bg-gray-300 rounded" />
                            )}
                            <span className="text-xs text-[#010D50]">{amenity.label}</span>
                          </div>
                        ))}
                      </div>

                      <button className="text-sm text-[#3754ED] font-medium">
                        More
                      </button>
                    </div>

                    {/* Pricing & CTA */}
                    <div className="mt-6 space-y-4">
                      <div className="flex flex-col items-end gap-1">
                        <span className="text-base text-[#010D50]">
                          {room.price.currency}{room.price.nightly.toLocaleString()} nightly
                        </span>
                        <span className="text-xl font-semibold text-[#010D50]">
                          {room.price.currency}{room.price.total.toLocaleString()} total
                        </span>
                        <span className="text-xs text-[#3A478A]">
                          * Locally payable taxes
                        </span>
                      </div>

                      <Button
                        className="w-full rounded-full py-3 h-auto gap-2 bg-[#3754ED] hover:bg-[#2A3FB8] text-white font-bold"
                      >
                        Reserve
                        <ChevronRight className="w-5 h-5" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Guest Reviews Section */}
          <div className="mx-4 lg:mx-6 mb-6 bg-[#F5F7FF] rounded-3xl p-6 lg:p-8 space-y-8">
            <h2 className="text-xl lg:text-2xl font-semibold text-[#010D50]">
              Guest review
            </h2>

            <div className="grid lg:grid-cols-[1fr_300px] gap-8">
              {/* Reviews & Cards */}
              <div className="space-y-6">
                {/* Score & Label */}
                <div className="flex items-center gap-4">
                  <div className="w-[178px] h-[165px] rounded-xl bg-[#008234] text-white flex flex-col items-center justify-center">
                    <span className="text-6xl font-medium">
                      {hotel.reviews.score.toFixed(1)}
                    </span>
                  </div>
                  <div className="flex flex-col gap-3">
                    <div className="flex items-center gap-3">
                      <span className="text-sm font-medium text-[#010D50]">
                        {hotel.reviews.label}
                      </span>
                      <span className="w-1 h-1 rounded-full bg-[#3A478A]" />
                      <span className="text-xs text-[#010D50]">
                        {hotel.reviews.count} reviews
                      </span>
                    </div>
                    <button className="text-xs text-[#3754ED] font-medium text-left">
                      Read all reviews
                    </button>
                  </div>
                </div>

                {/* Review Cards Grid */}
                <div className="grid sm:grid-cols-2 gap-4">
                  {reviews.slice(0, 4).map((review) => (
                    <div
                      key={review.id}
                      className="bg-white border border-[#DFE0E4] rounded-2xl p-6 space-y-4"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium text-[#010D50]">
                          {review.author}
                        </span>
                        <span className="text-sm font-medium text-[#010D50]">
                          {review.rating}
                        </span>
                      </div>
                      <p className="text-sm text-[#010D50] leading-relaxed line-clamp-3">
                        {review.text}
                      </p>
                      <button className="text-sm text-[#3754ED] font-medium">
                        Read more
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              {/* Rating Breakdown */}
              <div className="space-y-6">
                {Object.entries(hotel.reviews.breakdown).map(([key, value]) => (
                  <div key={key} className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-base font-medium text-[#010D50] capitalize">
                        {key === "freeWifi" ? "Free WiFi" : key === "valueForMoney" ? "Value for money" : key}
                      </span>
                      <span className="text-base font-medium text-[#010D50]">
                        {value.toFixed(1)}
                      </span>
                    </div>
                    <div className="h-2 bg-white rounded-lg overflow-hidden">
                      <div
                        className="h-full bg-[rgba(55,84,237,0.12)] rounded-lg"
                        style={{ width: `${(value / 10) * 100}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Policies Section */}
          <div className="mx-4 lg:mx-6 mb-6 py-6 border-t border-[#DFE0E4]">
            <div className="space-y-6">
              <h2 className="text-xl lg:text-2xl font-semibold text-[#010D50]">
                Policies
              </h2>
              <div className="text-sm text-[#3A478A] leading-relaxed whitespace-pre-line">
                {hotel.policies}
              </div>
            </div>
          </div>

          {/* FAQ Section */}
          <div className="mx-4 lg:mx-6 mb-6 bg-[#F5F7FF] rounded-3xl p-6 lg:p-8 space-y-6">
            <h2 className="text-xl lg:text-2xl font-semibold text-[#010D50]">
              Got questions about {hotel.name.split(' ').slice(0, 3).join(' ')}?
            </h2>

            <div className="space-y-4">
              {faqs.map((faq) => (
                <div
                  key={faq.id}
                  className="bg-white border border-[#DFE0E4] rounded-[32px] overflow-hidden"
                >
                  <button
                    onClick={() =>
                      setExpandedFAQ(expandedFAQ === faq.id ? null : faq.id)
                    }
                    className="w-full flex items-center justify-between p-6 text-left"
                  >
                    <span className="text-base lg:text-lg font-medium text-[#010D50] pr-4">
                      {faq.question}
                    </span>
                    {expandedFAQ === faq.id ? (
                      <ChevronUp className="w-6 h-6 text-[#010D50] flex-shrink-0" />
                    ) : (
                      <ChevronDown className="w-6 h-6 text-[#010D50] flex-shrink-0" />
                    )}
                  </button>
                  {expandedFAQ === faq.id && (
                    <div className="px-6 pb-6">
                      <p className="text-sm text-[#3A478A] leading-relaxed">
                        {faq.answer}
                      </p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Important Information Section */}
          <div className="mx-4 lg:mx-6 mb-6 py-6 border-t border-[#DFE0E4]">
            <div className="space-y-6">
              <h2 className="text-xl lg:text-2xl font-semibold text-[#010D50]">
                Important information
              </h2>
              <div className="text-sm text-[#3A478A] leading-relaxed whitespace-pre-line">
                {hotel.importantInfo}
              </div>
            </div>
          </div>
        </div>
      </div>

      <Footer />
    </div>
  );
}

