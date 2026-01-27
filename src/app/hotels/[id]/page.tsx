"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import Image from "next/image";
import Link from "next/link";
import { useParams, useRouter, useSearchParams } from "next/navigation";
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
  ChevronLeft,
} from "lucide-react";

import Navbar from "@/components/navigation/Navbar";
import Footer from "@/components/navigation/Footer";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { hotelService } from "@/services/api/hotelService";
import { useBookingStore } from "@/store/bookingStore";
import {
  mockHotelDetails,
} from "@/data/mockHotelDetails";
import { PackageStepProgress } from "@/components/packages/PackageStepProgress";

function LoadingBlock({ className }: { className: string }) {
  return <div className={`animate-pulse bg-gray-200/70 rounded-xl ${className}`} />;
}

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

// Map raw amenity text from API to { label, icon } format
function mapAmenityTextToIcon(text: string): string {
  const lowered = text.toLowerCase();
  if (lowered.includes("wi-fi") || lowered.includes("wifi") || lowered.includes("internet")) return "wifi";
  if (lowered.includes("pool") || lowered.includes("swim")) return "pool";
  if (lowered.includes("gym") || lowered.includes("fitness")) return "gym";
  if (lowered.includes("spa") || lowered.includes("massage") || lowered.includes("sauna")) return "spa";
  if (lowered.includes("restaurant") || lowered.includes("dining") || lowered.includes("breakfast")) return "restaurant";
  if (lowered.includes("parking") || lowered.includes("car park")) return "parking";
  if (lowered.includes("shuttle") || lowered.includes("transfer") || lowered.includes("airport")) return "shuttle";
  if (lowered.includes("pet") || lowered.includes("animal")) return "pets";
  if (lowered.includes("air condition") || lowered.includes("a/c") || lowered.includes("cooling")) return "ac";
  if (lowered.includes("hot tub") || lowered.includes("jacuzzi") || lowered.includes("whirlpool")) return "hot_tub";
  if (lowered.includes("bath") || lowered.includes("shower")) return "bathtub";
  if (lowered.includes("kitchen") || lowered.includes("cooking")) return "kitchen";
  if (lowered.includes("bed") || lowered.includes("room")) return "bed";
  if (lowered.includes("city") || lowered.includes("urban")) return "city";
  if (lowered.includes("garden") || lowered.includes("nature") || lowered.includes("outdoor")) return "nature";
  if (lowered.includes("group") || lowered.includes("conference") || lowered.includes("meeting")) return "group";
  return ""; // No icon match
}

function transformAmenities(rawAmenities: string[]): { label: string; icon: string }[] {
  return rawAmenities.map((text) => ({
    label: text,
    icon: mapAmenityTextToIcon(text),
  }));
}

// Navigation sections
const navSections = ["Overview", "About", "Rooms", "Accessibilities", "Policies"];

// Package mode mock rooms (so we don't depend on hotel APIs yet)
const mockPackageRooms: any[] = [
  {
    id: "pkg-room-1",
    name: "Deluxe King Room",
    bedType: "Breakfast included",
    reviews: { score: 9.2, label: "Excellent", count: 412 },
    isRefundable: true,
    paymentType: "Pay now",
    amenities: [
      { label: "Free WiFi", icon: "wifi" },
      { label: "Air conditioning", icon: "ac" },
      { label: "City view", icon: "city" },
    ],
    price: { currency: "£", nightly: 285, total: 1710 },
    _raw: { room_code: "PKG.DLX" },
  },
  {
    id: "pkg-room-2",
    name: "Premier Twin Room",
    bedType: "Room only",
    reviews: { score: 8.9, label: "Very good", count: 287 },
    isRefundable: false,
    paymentType: "Pay now",
    amenities: [
      { label: "Free WiFi", icon: "wifi" },
      { label: "Gym access", icon: "gym" },
    ],
    price: { currency: "£", nightly: 240, total: 1440 },
    _raw: { room_code: "PKG.PRM" },
  },
  {
    id: "pkg-room-3",
    name: "Executive Suite",
    bedType: "Breakfast included",
    reviews: { score: 9.5, label: "Exceptional", count: 155 },
    isRefundable: true,
    paymentType: "Pay now",
    amenities: [
      { label: "Free WiFi", icon: "wifi" },
      { label: "Spa access", icon: "spa" },
      { label: "Airport shuttle", icon: "shuttle" },
    ],
    price: { currency: "£", nightly: 410, total: 2460 },
    _raw: { room_code: "PKG.SUI" },
  },
];

export default function HotelRoomsPage() {
  const params = useParams();
  const hotelId = params?.id as string;
  const router = useRouter();
  const searchParams = useSearchParams();

  // Detect if we're in package (flight+hotel) mode
  const isPackageMode = searchParams.get("type") === "package";

  const hotelSearch = useBookingStore((s) => s.hotelSearch);
  const hotelResultsMeta = useBookingStore((s) => s.hotelResultsMeta);
  const setSelectedHotel = useBookingStore((s) => s.setSelectedHotel);
  const setSelectedHotelRoomIds = useBookingStore((s) => s.setSelectedHotelRoomIds);
  const selectedHotelRoomIds = useBookingStore((s) => s.selectedHotelRoomIds);
  const hotelDetailsCache = useBookingStore((s) => s.hotelDetailsCache);
  const setHotelDetailsCache = useBookingStore((s) => s.setHotelDetailsCache);
  const setSelectedHotelRoomSummary = useBookingStore((s) => s.setSelectedHotelRoomSummary);

  // State
  const [expandedFAQ, setExpandedFAQ] = useState<string | null>(null);
  const [showAllAmenities, setShowAllAmenities] = useState(false);
  const [activeSection, setActiveSection] = useState("Overview");
  const [remoteHotelHeader, setRemoteHotelHeader] = useState<{
    name: string;
    rating: number;
    image?: string;
    address?: string;
  } | null>(null);
  const [galleryOpen, setGalleryOpen] = useState(false);
  const [currentPhotoIndex, setCurrentPhotoIndex] = useState(0);
  const [galleryImages, setGalleryImages] = useState<string[]>([]);
  const [roomImages, setRoomImages] = useState<Record<string, string[]>>({});
  const [detailsText, setDetailsText] = useState<string>("");
  const [cancellationText, setCancellationText] = useState<string>("");
  const [remoteAmenities, setRemoteAmenities] = useState<string[]>([]);
  const [remoteRooms, setRemoteRooms] = useState<any[]>([]);
  const [coordinates, setCoordinates] = useState<{ lat: number; lng: number } | null>(null);
  const [roomsLoading, setRoomsLoading] = useState(false);
  const [roomsError, setRoomsError] = useState<string | null>(null);
  const [selectedRoomId, setSelectedRoomId] = useState<string | null>(null);

  function parseRemoteDataXml(remoteData: string, fallbackImageUrl?: string) {
    try {
      if (typeof window === "undefined") return null;
      const xml = String(remoteData || "").trim();
      if (!xml) return null;

      const parser = new DOMParser();
      const doc = parser.parseFromString(xml, "text/xml");

      // Hotelbeds images are hosted at photos.hotelbeds.com
      const HOTELBEDS_CDN = "https://photos.hotelbeds.com/giata/";

      const normalizeUrl = (u: string) => {
        const s = String(u || "").trim();
        if (!s) return "";
        if (s.startsWith("http://") || s.startsWith("https://")) return s;
        // For Hotelbeds-style paths like "15/156652/156652a_hb_l_015.jpeg"
        if (/^\d+\/\d+\//.test(s)) return `${HOTELBEDS_CDN}${s}`;
        if (s.startsWith("/")) return `https://photos.hotelbeds.com${s}`;
        return s;
      };

      // Try both formats: <Photo><Url> and <images><image path="...">
      let photos: string[] = [];
      // Room-specific images: { roomCode: string, images: string[] }
      const roomImages: Record<string, string[]> = {};

      // Format 1: <Photo><Url>...</Url></Photo> (older XML)
      const photoUrlNodes = Array.from(doc.querySelectorAll("Photo > Url"));
      if (photoUrlNodes.length > 0) {
        photos = photoUrlNodes
          .map((n) => normalizeUrl(n.textContent || ""))
          .filter(Boolean);
      }

      // Format 2: <images><image path="..."> (Hotelbeds XML)
      if (photos.length === 0) {
        const imageNodes = Array.from(doc.querySelectorAll("images > image"));
        imageNodes.forEach((img) => {
          const path = normalizeUrl(img.getAttribute("path") || "");
          if (!path) return;

          const roomCode = img.getAttribute("roomCode");
          if (roomCode) {
            // This is a room-specific image
            if (!roomImages[roomCode]) roomImages[roomCode] = [];
            roomImages[roomCode].push(path);
          } else {
            // General hotel image
            photos.push(path);
          }
        });
      }

      // Try both formats for amenities: <Amenity><Text> and <facilities><facility><description>
      let amenities: string[] = [];

      // Format 1: <Amenity><Text>...</Text></Amenity>
      const amenityTextNodes = Array.from(doc.querySelectorAll("Amenity > Text"));
      if (amenityTextNodes.length > 0) {
        amenities = amenityTextNodes
          .map((n) => String(n.textContent || "").trim())
          .filter(Boolean);
      }

      // Format 2: <facilities><facility><description>...</description></facility></facilities>
      if (amenities.length === 0) {
        const facilityNodes = Array.from(doc.querySelectorAll("facilities > facility > description"));
        amenities = facilityNodes
          .map((n) => String(n.textContent || "").trim())
          .filter(Boolean);
      }

      // Try both formats for description
      let descriptions: string[] = [];

      // Format 1: <Description><Text>...</Text></Description>
      const descTextNodes = Array.from(doc.querySelectorAll("Description > Text"));
      if (descTextNodes.length > 0) {
        descriptions = descTextNodes
          .map((n) =>
            String(n.textContent || "")
              .replace(/<br\s*\/?\s*>/gi, "\n")
              .replace(/<[^>]+>/g, "")
              .trim()
          )
          .filter(Boolean);
      }

      // Format 2: <hotel><description>...</description></hotel> (Hotelbeds)
      if (descriptions.length === 0) {
        const hotelDesc = doc.querySelector("hotel > description");
        if (hotelDesc?.textContent) {
          descriptions = [
            String(hotelDesc.textContent)
              .replace(/<br\s*\/?\s*>/gi, "\n")
              .replace(/<[^>]+>/g, "")
              .trim()
          ].filter(Boolean);
        }
      }

      const getText = (sel: string) => (doc.querySelector(sel)?.textContent || "").trim();

      // Try both address formats
      let address = "";

      // Format 1: <Address><Address1>...
      const addr1 = getText("Address > Address1");
      const addr2 = getText("Address > Address2");
      const city1 = getText("Address > City");
      const zip1 = getText("Address > Zip");
      const country1 = getText("Address > Country");
      address = [addr1, addr2, city1, zip1, country1].filter(Boolean).join(", ");

      // Format 2: <address street="...">...</address> + <city> + <postalCode>
      if (!address) {
        const addressNode = doc.querySelector("address");
        const streetAttr = addressNode?.getAttribute("street") || "";
        const addressText = addressNode?.textContent?.trim() || "";
        const city2 = getText("city");
        const zip2 = getText("postalCode");
        const countryDesc = getText("country > description");
        address = [streetAttr || addressText, city2, zip2, countryDesc].filter(Boolean).join(", ");
      }

      // Extract coordinates from XML: <coordinates latitude="..." longitude="..."/>
      let coords: { lat: number; lng: number } | null = null;
      const coordsNode = doc.querySelector("coordinates");
      if (coordsNode) {
        const lat = parseFloat(coordsNode.getAttribute("latitude") || "");
        const lng = parseFloat(coordsNode.getAttribute("longitude") || "");
        if (!isNaN(lat) && !isNaN(lng) && lat !== 0 && lng !== 0) {
          coords = { lat, lng };
        }
      }

      return {
        photos: Array.from(new Set(photos)),
        roomImages, // Room-specific images keyed by roomCode
        amenities: Array.from(new Set(amenities)),
        descriptions,
        address: address || undefined,
        coordinates: coords,
      };
    } catch {
      return null;
    }
  }

  // Refs for sections
  const overviewRef = useRef<HTMLDivElement>(null);
  const aboutRef = useRef<HTMLDivElement>(null);
  const roomsRef = useRef<HTMLDivElement>(null);
  const reviewsRef = useRef<HTMLDivElement>(null);

  // Hydrate from cache to avoid mock-first / flicker.
  useEffect(() => {
    const cached = hotelId ? hotelDetailsCache[hotelId] : undefined;
    if (!cached) return;

    if (cached.hotelName || cached.mainImage || cached.hotelRating) {
      setRemoteHotelHeader({
        name: cached.hotelName || remoteHotelHeader?.name || "",
        rating: cached.hotelRating || remoteHotelHeader?.rating || 0,
        image: cached.mainImage || remoteHotelHeader?.image,
        address: cached.address || remoteHotelHeader?.address,
      });
    }
    if (Array.isArray(cached.galleryImages)) setGalleryImages(cached.galleryImages);
    if (Array.isArray((cached as any).amenities)) setRemoteAmenities((cached as any).amenities);
    if (Array.isArray(cached.rooms)) setRemoteRooms(cached.rooms);
    if (typeof cached.detailsText === "string") setDetailsText(cached.detailsText);
    if (typeof cached.cancellationText === "string") setCancellationText(cached.cancellationText);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hotelId]);

  // Use mock structure only as a skeleton container; real content comes from API/cached values.
  const hotel = useMemo(() => {
    // Keep only structure from mock, but prefer API data; don't show mock marketing content.
    const base = mockHotelDetails;
    return {
      ...base,
      name: remoteHotelHeader?.name || base.name,
      starRating: remoteHotelHeader?.rating || base.starRating,
      mainImage: remoteHotelHeader?.image || base.mainImage,
      galleryImages: galleryImages.length > 0 ? galleryImages : (remoteHotelHeader?.image ? [remoteHotelHeader.image] : base.galleryImages),
      address: remoteHotelHeader?.address || base.address,
      about: {
        description: detailsText || "",
      },
      amenities: transformAmenities(remoteAmenities || []),
      reviews: { score: 0, label: "", count: 0, breakdown: {} as Record<string, number> },
      policies: cancellationText || "",
      mapUrl: coordinates
        ? `https://www.google.com/maps/search/?api=1&query=${coordinates.lat},${coordinates.lng}`
        : base.mapUrl || "#",
      coordinates,
    };
  }, [cancellationText, coordinates, detailsText, galleryImages, remoteAmenities, remoteHotelHeader]);
  const rooms = useMemo(() => {
    return remoteRooms;
  }, [remoteRooms]);
  const reviews: any[] = [];
  const faqs: any[] = [];

  const displayedAmenities = showAllAmenities ? hotel.amenities : hotel.amenities.slice(0, 6);

  useEffect(() => {
    let cancelled = false;

    async function loadRooms() {
      // Package mode should not use live hotel APIs yet.
      if (isPackageMode) {
        setRoomsLoading(true);
        setRoomsError(null);

        const headerName =
          searchParams.get("hotelName") ||
          hotelResultsMeta?.[hotelId]?.hotelName ||
          remoteHotelHeader?.name ||
          mockHotelDetails.name;

        const headerRating =
          Number((hotelResultsMeta?.[hotelId] as any)?.hotelRating || remoteHotelHeader?.rating || mockHotelDetails.starRating || 3) || 3;

        const headerImage =
          (hotelResultsMeta?.[hotelId] as any)?.image_name ||
          remoteHotelHeader?.image ||
          mockHotelDetails.mainImage;

        if (!cancelled) {
          setRemoteHotelHeader({
            name: headerName,
            rating: headerRating,
            image: headerImage,
            address: remoteHotelHeader?.address,
          });

          // Sort low -> high like the normal flow
          const flattened = [...mockPackageRooms].sort((a, b) => (a.price.total || 0) - (b.price.total || 0));
          const cheapest = flattened[0];

          setRemoteRooms(flattened);
          setSelectedHotel({ hotelId, hotelName: headerName });

          if (cheapest?.id) {
            setSelectedHotelRoomIds([String(cheapest.id)]);
            setSelectedRoomId(String(cheapest.id));
            setSelectedHotelRoomSummary({
              hotelId,
              roomId: String(cheapest.id),
              roomName: cheapest?.name,
              mealName: cheapest?.bedType,
              isRefundable: cheapest?.isRefundable,
              currency: cheapest?.price?.currency,
              total: cheapest?.price?.total,
              nightly: cheapest?.price?.nightly,
            });
          }
        }

        if (!cancelled) setRoomsLoading(false);
        return;
      }

      if (!hotelSearch?.searchCriteriaId) return;
      setRoomsLoading(true);
      setRoomsError(null);

      try {
        const meta = hotelResultsMeta?.[hotelId];
        const srId = meta?.srId || meta?.searchResultId;
        const resp = await hotelService.getRoomsV3(hotelSearch.searchCriteriaId, hotelId, srId);

        const respAny: any = resp as any;
        const headerName = respAny?.hotel_name || meta?.hotelName || mockHotelDetails.name;
        const headerRating = Number(respAny?.hotel_rating || mockHotelDetails.starRating || 3) || 3;
        const headerImage = respAny?.image_name || mockHotelDetails.mainImage;
        const headerAddress =
          respAny?.address1 || respAny?.address2
            ? [respAny?.address1, respAny?.address2].filter(Boolean).join(", ")
            : undefined;

        setRemoteHotelHeader({
          name: headerName,
          rating: headerRating,
          image: headerImage,
          address: headerAddress,
        });

        // Extract coordinates from API response (geo_loc_latitude/longitude or latitude/longitude)
        const lat = respAny?.geo_loc_latitude || respAny?.latitude;
        const lng = respAny?.geo_loc_longitude || respAny?.longitude;
        if (lat && lng && lat !== 0 && lng !== 0) {
          setCoordinates({ lat: Number(lat), lng: Number(lng) });
        }

        // Use available image(s) for gallery/thumbnails. Typically only one image URL is provided.
        const imgs = headerImage ? [headerImage] : [];
        setGalleryImages(imgs);

        // Real schema (seen in stage): rooms.room1options[] with {id, room_name, meal_name, net_price, nonRef, ...}
        const roomsObj: any = respAny?.rooms;
        const room1options: any[] = Array.isArray(roomsObj?.room1options) ? roomsObj.room1options : [];

        const flattened: any[] = room1options.map((opt: any) => ({
          id: String(opt?.id),
          name: opt?.room_name || "Room",
          bedType: opt?.meal_name || opt?.MealPlan || "Meal plan",
          reviews: { score: 0, label: "No reviews", count: 0 },
          isRefundable: opt?.nonRef === 0,
          paymentType: "Pay now",
          amenities: [],
          price: {
            currency: opt?.sell_currency_code === "GBP" ? "£" : opt?.sell_currency_code || "£",
            nightly: Number(opt?.days_spent) > 0 ? Number(opt?.net_price || 0) / Number(opt?.days_spent) : Number(opt?.net_price || 0),
            total: Number(opt?.net_price || 0),
          },
          _raw: opt,
        }));

        // Sort rooms low -> high (user request)
        flattened.sort((a, b) => (a.price.total || 0) - (b.price.total || 0));
        const cheapest = flattened[0];

        if (!cancelled) {
          setRemoteRooms(flattened);
          setSelectedHotel({ hotelId, hotelName: headerName });
          if (cheapest?.id) {
            setSelectedHotelRoomIds([String(cheapest.id)]);
            setSelectedRoomId(String(cheapest.id));
            setSelectedHotelRoomSummary({
              hotelId,
              roomId: String(cheapest.id),
              roomName: cheapest?.name,
              mealName: cheapest?.bedType,
              isRefundable: cheapest?.isRefundable,
              currency: cheapest?.price?.currency,
              total: cheapest?.price?.total,
              nightly: cheapest?.price?.nightly,
            });

            // Populate additional hotel fields from hotel_search_details (best available content in current API set)
            if (hotelSearch?.location && hotelSearch?.hidden_id && hotelSearch?.hidden_key) {
              const detailsPayload: any[] = [
                {
                  location: hotelSearch.location,
                  hidden_id: Number(hotelSearch.hidden_id),
                  hidden_key: hotelSearch.hidden_key,
                  nights: Math.max(
                    1,
                    Math.round(
                      (new Date(hotelSearch.checkOut).getTime() - new Date(hotelSearch.checkIn).getTime()) /
                      (1000 * 60 * 60 * 24)
                    )
                  ),
                  rooms: hotelSearch.rooms,
                  adults: hotelSearch.adults,
                  children: hotelSearch.children,
                  arrivalDate: hotelSearch.checkIn,
                  departureDate: hotelSearch.checkOut,
                  internal_rates: 1,
                  live_rates: 1,
                  optionsRadios: "hotels",
                  branches: hotelSearch.branches || "UK",
                  arrival: hotelSearch.checkIn,
                  departure: hotelSearch.checkOut,
                  searchCriteriaId: hotelSearch.searchCriteriaId,
                },
                { 1: { ids: Number(cheapest.id) } },
              ];

              hotelService
                .hotelSearchDetails(detailsPayload)
                .then((d: any) => {
                  const desc = (d?.description || d?.hotels?.quickDescription || "").toString();
                  setDetailsText(desc);
                  const policy = Array.isArray(d?.Cancellation) && d.Cancellation[0]?.SearchResultCancellation?.cancellationPolicy
                    ? String(d.Cancellation[0].SearchResultCancellation.cancellationPolicy)
                    : "";
                  // Basic HTML -> text
                  setCancellationText(
                    policy
                      .replace(/<br\s*\/?\s*>/gi, "\n")
                      .replace(/<[^>]+>/g, "")
                      .trim()
                  );

                  const remoteData = d?.liveDetails?.SupplierMapVendor?.remoteData;
                  const parsed = remoteData ? parseRemoteDataXml(String(remoteData), headerImage) : null;
                  const nextGallery = parsed?.photos?.length ? parsed.photos : imgs;
                  if (parsed?.amenities?.length) setRemoteAmenities(parsed.amenities);
                  if (parsed?.roomImages && Object.keys(parsed.roomImages).length > 0) {
                    setRoomImages(parsed.roomImages);
                  }
                  if (parsed?.descriptions?.length && !desc) {
                    setDetailsText(parsed.descriptions.slice(0, 3).join("\n\n"));
                  }
                  if (parsed?.address && !headerAddress) {
                    setRemoteHotelHeader((prev) =>
                      prev
                        ? { ...prev, address: parsed.address }
                        : { name: headerName, rating: headerRating, image: headerImage, address: parsed.address }
                    );
                  }
                  if (nextGallery.length > 0) setGalleryImages(nextGallery);
                  // Update coordinates from XML if not already set
                  if (parsed?.coordinates && !coordinates) {
                    setCoordinates(parsed.coordinates);
                  }

                  // Persist details in store cache
                  setHotelDetailsCache(hotelId, {
                    hotelId,
                    hotelName: headerName,
                    hotelRating: headerRating,
                    mainImage: headerImage,
                    address: (parsed?.address || headerAddress),
                    galleryImages: nextGallery,
                    rooms: flattened,
                    detailsText: desc || (parsed?.descriptions?.slice(0, 3).join("\n\n") || ""),
                    cancellationText:
                      policy
                        .replace(/<br\s*\/?\s*>/gi, "\n")
                        .replace(/<[^>]+>/g, "")
                        .trim(),
                    // Also persist parsed amenity texts for UI display
                    amenities: parsed?.amenities || [],
                    fetchedAt: Date.now(),
                  });
                })
                .catch(() => {
                  // no-op (keep empty)
                });
            }

            // Persist header + rooms even if details call not used/returns empty
            setHotelDetailsCache(hotelId, {
              hotelId,
              hotelName: headerName,
              hotelRating: headerRating,
              mainImage: headerImage,
              address: headerAddress,
              galleryImages: imgs,
              rooms: flattened,
              detailsText,
              cancellationText,
              fetchedAt: Date.now(),
            });
          }
        }
      } catch (e: any) {
        if (!cancelled) {
          setRoomsError(e?.message || "Failed to load rooms");
          setRemoteRooms([]);
        }
      } finally {
        if (!cancelled) setRoomsLoading(false);
      }
    }

    loadRooms();
    return () => {
      cancelled = true;
    };
  }, [hotelId, hotelResultsMeta, hotelSearch?.searchCriteriaId, isPackageMode, searchParams, setSelectedHotel]);

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

      {/* Hard loader: avoid showing mock-first UI */}
      {!remoteHotelHeader && roomsLoading && (
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8">
          <div className="space-y-6">
            <LoadingBlock className="h-10 w-2/3" />
            <LoadingBlock className="h-6 w-1/2" />
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
              <LoadingBlock className="h-[320px] lg:h-[450px] lg:col-span-2" />
              <div className="grid grid-cols-3 lg:grid-cols-1 gap-3">
                <LoadingBlock className="h-[100px] lg:h-[140px]" />
                <LoadingBlock className="h-[100px] lg:h-[140px]" />
                <LoadingBlock className="h-[100px] lg:h-[140px]" />
              </div>
            </div>
            <div className="grid lg:grid-cols-3 gap-6">
              <LoadingBlock className="h-[220px]" />
              <LoadingBlock className="h-[220px]" />
              <LoadingBlock className="h-[220px]" />
            </div>
          </div>
        </div>
      )}

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
                  className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${activeSection === section
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

      {/* Package Mode: Step Progress */}
      {isPackageMode && (
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 pt-6">
          <PackageStepProgress currentStep="stay" />
        </div>
      )}

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
                <div
                  className="relative flex-[2] min-h-[300px] lg:min-h-[450px] rounded-2xl overflow-hidden cursor-pointer group"
                  onClick={() => {
                    setCurrentPhotoIndex(0);
                    setGalleryOpen(true);
                  }}
                >
                  <Image
                    src={hotel.mainImage}
                    alt={hotel.name}
                    fill
                    className="object-cover transition-transform duration-500 group-hover:scale-105"
                    priority
                  />
                  {/* Show All Photos Button - Bottom left of main image */}
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setGalleryOpen(true);
                    }}
                    className="absolute bottom-4 left-4 flex items-center gap-2 px-4 py-2 rounded-lg bg-white/90 backdrop-blur-sm hover:bg-white transition-all shadow-sm hover:shadow-md"
                  >
                    <Grid3X3 className="w-4 h-4 text-[#010D50]" />
                    <span className="text-sm font-medium text-[#010D50]">Show All Photos</span>
                  </button>
                </div>

                {/* Thumbnail Stack - 3 images vertically on right */}
                <div className="flex flex-row lg:flex-col gap-3 lg:w-[220px]">
                  {Array.from({ length: 3 }).map((_, idx) => {
                    // Logic to skip the main image if it's the first one in galleryImages
                    const firstIsMain = hotel.galleryImages?.[0] === hotel.mainImage;
                    const imgIndex = firstIsMain ? idx + 1 : idx;
                    const img = (hotel.galleryImages || [])[imgIndex];

                    return (
                      <div
                        key={idx}
                        className="relative flex-1 lg:flex-none lg:h-[140px] min-h-[100px] rounded-xl overflow-hidden bg-gray-100 cursor-pointer group"
                        onClick={() => {
                          setCurrentPhotoIndex(imgIndex);
                          setGalleryOpen(true);
                        }}
                      >
                        {img ? (
                          <Image
                            src={img}
                            alt={`${hotel.name} - ${idx + 1}`}
                            fill
                            className="object-cover transition-transform duration-500 group-hover:scale-110"
                          />
                        ) : (
                          <div className="absolute inset-0 grid place-content-center text-xs text-[#3A478A] px-3 text-center">
                            Content missing from API: photo
                          </div>
                        )}
                        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors" />
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>

          <Dialog open={galleryOpen} onOpenChange={setGalleryOpen}>
            <DialogContent className="max-w-none w-screen h-screen p-0 bg-black/95 border-none rounded-none overflow-hidden z-[9999]">
              <div className="relative w-full h-full flex flex-col pt-12 pb-24">
                {/* Close Button */}
                <button
                  onClick={() => setGalleryOpen(false)}
                  className="absolute top-6 right-6 z-50 p-2.5 rounded-full bg-white/10 hover:bg-white/20 text-white transition-all backdrop-blur-md border border-white/20 group"
                >
                  <X className="w-6 h-6 transition-transform group-hover:scale-110" />
                </button>

                {/* Main Viewer Area */}
                <div className="flex-1 relative flex items-center justify-center px-4 overflow-hidden">
                  <AnimatePresence mode="wait">
                    <motion.div
                      key={currentPhotoIndex}
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.95 }}
                      transition={{ duration: 0.3, ease: "easeOut" }}
                      className="relative w-full h-full max-w-6xl max-h-[80vh] rounded-2xl overflow-hidden shadow-2xl"
                    >
                      <Image
                        src={hotel.galleryImages[currentPhotoIndex]}
                        alt={`Photo ${currentPhotoIndex + 1}`}
                        fill
                        className="object-contain"
                        sizes="100vw"
                      />
                    </motion.div>
                  </AnimatePresence>

                  {/* Navigation Arrows */}
                  {hotel.galleryImages.length > 1 && (
                    <>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setCurrentPhotoIndex((prev) => (prev > 0 ? prev - 1 : hotel.galleryImages.length - 1));
                        }}
                        className="absolute left-6 top-1/2 -translate-y-1/2 p-3 rounded-full bg-white/10 hover:bg-white/20 text-white transition-all backdrop-blur-md border border-white/20 group hidden md:block"
                      >
                        <ChevronLeft className="w-8 h-8 transition-transform group-hover:-translate-x-1" />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setCurrentPhotoIndex((prev) => (prev < hotel.galleryImages.length - 1 ? prev + 1 : 0));
                        }}
                        className="absolute right-6 top-1/2 -translate-y-1/2 p-3 rounded-full bg-white/10 hover:bg-white/20 text-white transition-all backdrop-blur-md border border-white/20 group hidden md:block"
                      >
                        <ChevronRight className="w-8 h-8 transition-transform group-hover:translate-x-1" />
                      </button>
                    </>
                  )}

                  {/* Photo Counter */}
                  <div className="absolute top-6 left-1/2 -translate-x-1/2 px-4 py-1.5 rounded-full bg-white/10 backdrop-blur-md border border-white/10 text-white/90 text-sm font-medium">
                    {currentPhotoIndex + 1} / {hotel.galleryImages.length}
                  </div>
                </div>

                {/* Thumbnail Strip */}
                <div className="absolute bottom-0 left-0 right-0 h-32 bg-black/40 backdrop-blur-md border-t border-white/10 p-4">
                  <div className="flex items-center justify-center gap-3 overflow-x-auto pb-2 h-full scrollbar-hide">
                    {hotel.galleryImages.map((img: string, idx: number) => (
                      <button
                        key={`${img}-${idx}`}
                        onClick={() => setCurrentPhotoIndex(idx)}
                        className={`relative h-20 aspect-[4/3] rounded-lg overflow-hidden flex-shrink-0 transition-all duration-300 ${currentPhotoIndex === idx
                          ? "ring-2 ring-[#3754ED] scale-110 translate-y-[-4px] opacity-100"
                          : "opacity-40 hover:opacity-100"
                          }`}
                      >
                        <Image
                          src={img}
                          alt={`Thumbnail ${idx + 1}`}
                          fill
                          className="object-cover"
                        />
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </DialogContent>
          </Dialog>

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
                    {hotel.about.description || "Content missing from API: description"}
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
                {hotel.reviews?.count > 0 && (
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
                )}

                {/* Map Card */}
                <div className="border border-[#DFE0E4] rounded-2xl overflow-hidden">
                  <div className="relative aspect-[4/3] bg-gray-200">
                    {hotel.coordinates ? (
                      <iframe
                        src={`https://www.openstreetmap.org/export/embed.html?bbox=${hotel.coordinates.lng - 0.01}%2C${hotel.coordinates.lat - 0.008}%2C${hotel.coordinates.lng + 0.01}%2C${hotel.coordinates.lat + 0.008}&layer=mapnik&marker=${hotel.coordinates.lat}%2C${hotel.coordinates.lng}`}
                        className="absolute inset-0 w-full h-full border-0"
                        style={{ border: 0 }}
                        loading="lazy"
                        title={`Map showing ${hotel.name}`}
                      />
                    ) : (
                      <Image
                        src="/figma/hotels/hotel-card-image.png"
                        alt="Map"
                        fill
                        className="object-cover opacity-60"
                      />
                    )}
                    <div className="absolute inset-x-0 bottom-0 flex items-end p-6 bg-gradient-to-t from-black/50 to-transparent">
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
              {rooms.length === 0 && !roomsLoading && (
                <div className="text-sm text-[#3A478A]">
                  Content missing from API: room options
                </div>
              )}
              <div className="grid lg:grid-cols-3 gap-6">
                {roomsError && (
                  <div className="lg:col-span-3 text-sm text-red-600">{roomsError}</div>
                )}
                {roomsLoading && (
                  <div className="lg:col-span-3 text-sm text-[#3A478A]">Loading room options…</div>
                )}
                {rooms.map((room) => {
                  // Get room-specific image if available
                  const roomCode = room._raw?.room_code || "";
                  // Try exact match first, then match on room type prefix (e.g., "DBT" from "DBT.ST")
                  const roomTypePrefix = roomCode.split(".")[0];
                  const roomImgList = roomImages[roomCode] ||
                    (roomTypePrefix ? Object.entries(roomImages).find(([k]) => k.startsWith(roomTypePrefix + "."))?.[1] : undefined) ||
                    [];
                  // Only show image if room-specific image is available
                  const roomImage = roomImgList[0] || "";

                  return (
                    <div
                      key={room.id}
                      className={[
                        "border rounded-[32px] bg-white overflow-hidden flex flex-col h-full cursor-pointer",
                        selectedRoomId === room.id ? "border-[#3754ED]" : "border-[#DFE0E4]",
                      ].join(" ")}
                      onClick={() => setSelectedRoomId(room.id)}
                    >
                      {/* Room Image */}
                      {roomImage && (
                        <div className="relative w-full h-40 bg-gray-100">
                          <img
                            src={roomImage}
                            alt={room.name}
                            className="w-full h-full object-cover"
                          />
                        </div>
                      )}

                      {/* Room Info */}
                      <div className="flex-1 space-y-4 p-6">
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
                          <div className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs ${room.isRefundable
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
                          {room.amenities.slice(0, 5).map((amenity: any) => (
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
                            onClick={(e) => {
                              e.stopPropagation();
                              const rid = selectedRoomId || room.id;
                              setSelectedHotelRoomIds([String(rid)]);
                              // Persist summary for checkout display
                              setSelectedHotelRoomSummary({
                                hotelId,
                                roomId: String(rid),
                                roomName: room?.name,
                                mealName: room?.bedType,
                                isRefundable: room?.isRefundable,
                                currency: room?.price?.currency,
                                total: room?.price?.total,
                                nightly: room?.price?.nightly,
                              });
                              // Navigate based on mode
                              if (isPackageMode) {
                                // For package mode, go to flight search with package context
                                const params = new URLSearchParams();
                                params.set("type", "package");
                                params.set("hotelId", hotelId);
                                params.set("hotelName", hotel.name);
                                params.set("roomId", String(rid));
                                // Preserve search params for flight search
                                const checkIn = searchParams.get("checkIn");
                                const checkOut = searchParams.get("checkOut");
                                const guests = searchParams.get("guests") || searchParams.get("adults") || "2";
                                const rooms = searchParams.get("rooms") || "1";
                                if (checkIn) {
                                  params.set("departureDate", checkIn);
                                  params.set("checkIn", checkIn);
                                }
                                if (checkOut) {
                                  params.set("returnDate", checkOut);
                                  params.set("checkOut", checkOut);
                                }
                                params.set("guests", guests);
                                params.set("rooms", rooms);
                                // Default origin/destination - in real app these would come from user selection
                                params.set("from", "LHR");
                                params.set("to", "HKG");
                                params.set("adults", guests);
                                params.set("tripType", "round-trip");
                                router.push(`/search?${params.toString()}`);
                              } else {
                                router.push("/hotels/checkout");
                              }
                            }}
                          >
                            {isPackageMode ? "Continue Booking" : "Reserve"}
                            <ChevronRight className="w-5 h-5" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Guest Reviews Section */}
          {hotel.reviews?.count > 0 && (
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
                  {Object.entries(hotel.reviews.breakdown as Record<string, number>).map(([key, value]) => (
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
          )}

          {/* Policies Section */}
          <div className="mx-4 lg:mx-6 mb-6 py-6 border-t border-[#DFE0E4]">
            <div className="space-y-6">
              <h2 className="text-xl lg:text-2xl font-semibold text-[#010D50]">
                Policies
              </h2>
              <div className="text-sm text-[#3A478A] leading-relaxed whitespace-pre-line">
                {hotel.policies || "Content missing from API: cancellation/policies"}
              </div>
            </div>
          </div>

          {/* FAQ Section */}
          {faqs.length > 0 && (
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
          )}

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

