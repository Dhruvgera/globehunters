import { Hotel } from "@/types/hotel";

const IMG = "/figma/hotels/hotel-card-image.png";

export const mockHotels: Hotel[] = [
  {
    id: "h-1",
    name: "The Peninsula Hong Kong",
    distanceLabel: "15.11 mi from Hong Kong Intl. (HKG)",
    neighborhood: "Tsim Sha Tsui",
    starRating: 5,
    amenities: ["Pet-friendly", "Airport shuttle included"],
    room: {
      name: "Deluxe Room · 1 Queen Bed",
      highlights: [
        "Free cancellation till 24 hrs before check-in",
        "Reserve without a credit card",
      ],
    },
    reviews: { score: 9.3, label: "Exceptional", count: 900 },
    price: { currency: "$", nightly: 681, total: 3847, nights: 2, rooms: 1 },
    imageSrc: IMG,
  },
  {
    id: "h-2",
    name: "Harbour Grand Kowloon",
    distanceLabel: "12.40 mi from Hong Kong Intl. (HKG)",
    neighborhood: "Kowloon",
    starRating: 4,
    amenities: ["Breakfast included", "Free cancellation"],
    room: {
      name: "Superior Room · 2 Twin Beds",
      highlights: ["Free cancellation till 24 hrs before check-in"],
    },
    reviews: { score: 8.7, label: "Excellent", count: 512 },
    price: { currency: "$", nightly: 219, total: 492, nights: 2, rooms: 1 },
    imageSrc: IMG,
  },
  {
    id: "h-3",
    name: "Eaton HK",
    distanceLabel: "16.02 mi from Hong Kong Intl. (HKG)",
    neighborhood: "Jordan",
    starRating: 4,
    amenities: ["Pet-friendly", "Breakfast included"],
    room: {
      name: "Standard Room · 1 Queen Bed",
      highlights: ["Reserve without a credit card"],
    },
    reviews: { score: 8.9, label: "Excellent", count: 1240 },
    price: { currency: "$", nightly: 154, total: 329, nights: 2, rooms: 1 },
    imageSrc: IMG,
  },
  {
    id: "h-4",
    name: "Cordis, Hong Kong",
    distanceLabel: "14.55 mi from Hong Kong Intl. (HKG)",
    neighborhood: "Mong Kok",
    starRating: 5,
    amenities: ["Airport shuttle included", "Free cancellation"],
    room: {
      name: "Club Room · 1 King Bed",
      highlights: ["Free cancellation till 24 hrs before check-in"],
    },
    reviews: { score: 9.1, label: "Exceptional", count: 780 },
    price: { currency: "$", nightly: 402, total: 899, nights: 2, rooms: 1 },
    imageSrc: IMG,
  },
  {
    id: "h-5",
    name: "Hotel ICON",
    distanceLabel: "13.02 mi from Hong Kong Intl. (HKG)",
    neighborhood: "Tsim Sha Tsui",
    starRating: 5,
    amenities: ["Breakfast included", "Reserve without a credit card"],
    room: {
      name: "Deluxe Room · 1 King Bed",
      highlights: ["Reserve without a credit card"],
    },
    reviews: { score: 9.0, label: "Exceptional", count: 1620 },
    price: { currency: "$", nightly: 310, total: 705, nights: 2, rooms: 1 },
    imageSrc: IMG,
  },
  {
    id: "h-6",
    name: "Ovolo Central",
    distanceLabel: "15.88 mi from Hong Kong Intl. (HKG)",
    neighborhood: "Central",
    starRating: 4,
    amenities: ["Pet-friendly", "Free cancellation"],
    room: {
      name: "City View Room · 1 Queen Bed",
      highlights: ["Free cancellation till 24 hrs before check-in"],
    },
    reviews: { score: 8.5, label: "Very good", count: 338 },
    price: { currency: "$", nightly: 198, total: 434, nights: 2, rooms: 1 },
    imageSrc: IMG,
  },
];


