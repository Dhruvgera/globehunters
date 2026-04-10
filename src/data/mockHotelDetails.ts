export const mockHotelDetails = {
  id: "h-2",
  name: "Regala Skycity Hotel by Regal Hotels",
  address: "72 Nathan Road Flat 801, 8/F, Kowloon, Yau Tsim Mong District, Hong Kong, Hong Kong",
  starRating: 5,
  mainImage: "/figma/hotels/hotel-card-image.png",
  galleryImages: [
    "/figma/hotels/hotel-card-image.png",
    "/figma/hotels/hotel-card-image.png",
    "/figma/hotels/hotel-card-image.png",
    "/figma/hotels/hotel-card-image.png",
  ],
  about: {
    description: `Upscale hotel near AsiaWorld-Expo

Located close to Skyplur and Citygate Outlets, Regala Skycity Hotel by Regal Hotels provides free airport drop-off, a garden, and dry cleaning/laundry services. The on-site international cuisine restaurant, Pena, offers breakfast, lunch, and dinner. Stay connected with free in-room WiFi, with speed of 50+ Mbps, and guests can find other amenities such as an outdoor entertainment area and a conference centre.

Other perks at this hotel include:

• An outdoor pool
• Buffet breakfast (surcharge), a free shopping center shuttle, and meeting rooms
• Concierge services, outdoor furniture, and luggage storage
• Tour/ticket assistance, smoke-free premises, and a banquet hall
• Guest reviews say great things about the helpful staff

Room features

All 1208 rooms offer comforts such as laptop-compatible safes and laptop-friendly workspaces, in addition to perks like free WiFi and desk chairs. Guest reviews highly rate the clean rooms at the property.

More amenities include:

Free tea bags/instant coffee and electric kettles
Bathrooms with showers and hair dryers
43-inch flat-screen TVs with digital channels
Wardrobes/closets, daily housekeeping, and desks`,
  },
  amenities: [
    { icon: "pets", label: "Pet-friendly" },
    { icon: "shuttle", label: "Airport shuttle included" },
    { icon: "gym", label: "Gym" },
    { icon: "spa", label: "Spa" },
    { icon: "ac", label: "Air Conditioned" },
    { icon: "hot_tub", label: "Hot Tub" },
    { icon: "pool", label: "Pool" },
    { icon: "wifi", label: "Free WiFi" },
    { icon: "restaurant", label: "Restaurant" },
    { icon: "parking", label: "Parking" },
  ],
  reviews: {
    score: 9.3,
    label: "Exceptional",
    count: 900,
    breakdown: {
      staff: 9.1,
      cleanliness: 9.4,
      comfort: 9.5,
      freeWifi: 8.5,
      facilities: 9.0,
      valueForMoney: 8.4,
    },
  },
  mapUrl: "https://maps.google.com",
  policies: `Upscale hotel near AsiaWorld-Expo

Located close to Skyplur and Citygate Outlets, Regala Skycity Hotel by Regal Hotels provides free airport drop-off, a garden, and dry cleaning/laundry services. The on-site international cuisine restaurant, Pena, offers breakfast, lunch, and dinner. Stay connected with free in-room WiFi, with speed of 50+ Mbps, and guests can find other amenities such as an outdoor entertainment area and a conference centre.

Other perks at this hotel include:

• An outdoor pool
• Buffet breakfast (surcharge), a free shopping center shuttle, and meeting rooms
• Concierge services, outdoor furniture, and luggage storage
• Tour/ticket assistance, smoke-free premises, and a banquet hall
• Guest reviews say great things about the helpful staff

Room features

All 1208 rooms offer comforts such as laptop-compatible safes and laptop-friendly workspaces, in addition to perks like free WiFi and desk chairs. Guest reviews highly rate the clean rooms at the property.

More amenities include:

Free tea bags/instant coffee and electric kettles
Bathrooms with showers and hair dryers
43-inch flat-screen TVs with digital channels
Wardrobes/closets, daily housekeeping, and desks`,
  importantInfo: `Check-in: 3:00 PM
Check-out: 11:00 AM

You'll be asked to pay the following charges at the property:
• Deposit: GBP 100 per stay
• Tourism fee: GBP 2.50 per person, per night

We have included all charges provided to us by the property. However, charges can vary, for example, based on length of stay or the room you book.`,
};

export const mockHotelRooms = [
  {
    id: "room-1",
    name: "Garden View Room",
    bedType: "1 Double Bed OR 2 Twin Beds",
    reviews: {
      score: 9.3,
      label: "Exceptional",
      count: 900,
    },
    isRefundable: false,
    paymentType: "Pay Online",
    amenities: [
      { icon: "fullscreen", label: "183 sq ft" },
      { icon: "group", label: "Sleeps 2" },
      { icon: "bed", label: "1 Double Bed OR 2 Twin Beds" },
      { icon: "wifi", label: "Free WiFi" },
      { icon: "nature", label: "Garden View" },
    ],
    price: {
      currency: "$",
      nightly: 681,
      total: 3847,
    },
  },
  {
    id: "room-2",
    name: "Garden View Room",
    bedType: "1 Double Bed OR 2 Twin Beds",
    reviews: {
      score: 9.3,
      label: "Exceptional",
      count: 900,
    },
    isRefundable: false,
    paymentType: "Pay Online",
    amenities: [
      { icon: "fullscreen", label: "183 sq ft" },
      { icon: "group", label: "Sleeps 2" },
      { icon: "bed", label: "1 Double Bed OR 2 Twin Beds" },
      { icon: "wifi", label: "Free WiFi" },
      { icon: "nature", label: "Garden View" },
    ],
    price: {
      currency: "$",
      nightly: 567,
      total: 3247,
    },
  },
  {
    id: "room-3",
    name: "Garden View Room",
    bedType: "1 Double Bed",
    reviews: {
      score: 9.3,
      label: "Exceptional",
      count: 900,
    },
    isRefundable: false,
    paymentType: "Pay Online",
    amenities: [
      { icon: "fullscreen", label: "201 sq ft" },
      { icon: "group", label: "Sleeps 2" },
      { icon: "bed", label: "1 Double Bed" },
      { icon: "wifi", label: "Free WiFi" },
      { icon: "city", label: "City View" },
    ],
    price: {
      currency: "$",
      nightly: 577,
      total: 3247,
    },
  },
  {
    id: "room-4",
    name: "Suite Cityview",
    bedType: "1 King Bed",
    reviews: {
      score: 9.3,
      label: "Exceptional",
      count: 900,
    },
    isRefundable: false,
    paymentType: "Pay Online",
    amenities: [
      { icon: "fullscreen", label: "183 sq ft" },
      { icon: "group", label: "Sleeps 2" },
      { icon: "bed", label: "1 King Bed" },
      { icon: "wifi", label: "Free WiFi" },
      { icon: "bathtub", label: "Bathtub" },
    ],
    price: {
      currency: "$",
      nightly: 620,
      total: 3547,
    },
  },
  {
    id: "room-5",
    name: "Executive Room, 1 King Bed",
    bedType: "1 King Bed",
    reviews: {
      score: 9.3,
      label: "Exceptional",
      count: 900,
    },
    isRefundable: false,
    paymentType: "Pay Online",
    amenities: [
      { icon: "fullscreen", label: "201 sq ft" },
      { icon: "group", label: "Sleeps 2" },
      { icon: "bed", label: "1 King Bed" },
      { icon: "wifi", label: "Free WiFi" },
      { icon: "city", label: "City View" },
    ],
    price: {
      currency: "$",
      nightly: 560,
      total: 3165,
    },
  },
  {
    id: "room-6",
    name: "Garden View Room",
    bedType: "2 Twin Beds",
    reviews: {
      score: 9.3,
      label: "Exceptional",
      count: 900,
    },
    isRefundable: false,
    paymentType: "Pay Online",
    amenities: [
      { icon: "fullscreen", label: "183 sq ft" },
      { icon: "group", label: "Sleeps 2" },
      { icon: "bed", label: "2 Twin Beds" },
      { icon: "wifi", label: "Free WiFi" },
      { icon: "nature", label: "Garden View" },
    ],
    price: {
      currency: "$",
      nightly: 510,
      total: 2949,
    },
  },
  {
    id: "room-7",
    name: "Junior Club Suite",
    bedType: "1 King Bed",
    reviews: {
      score: 9.3,
      label: "Exceptional",
      count: 900,
    },
    isRefundable: false,
    paymentType: "Pay Online",
    amenities: [
      { icon: "fullscreen", label: "301 sq ft" },
      { icon: "group", label: "Sleeps 2" },
      { icon: "bed", label: "1 King Bed" },
      { icon: "wifi", label: "Free WiFi" },
      { icon: "kitchen", label: "Kitchenette" },
    ],
    price: {
      currency: "$",
      nightly: 447,
      total: 2547,
    },
  },
];

export const mockHotelReviews = [
  {
    id: "review-1",
    author: "Sarah M.",
    rating: "9.3/10 Exceptional",
    text: "Great location and view. Check-out was easy and they even had water and tea available. Would stay again. The staff was incredibly helpful and the room was spotless.",
  },
  {
    id: "review-2",
    author: "James K.",
    rating: "9.5/10 Exceptional",
    text: "Amazing hotel with fantastic amenities. The pool area is beautiful and the gym is well-equipped. Breakfast buffet had a great selection of both local and international dishes.",
  },
  {
    id: "review-3",
    author: "Emily R.",
    rating: "9.0/10 Excellent",
    text: "Loved the spa facilities and the room service was prompt. The bed was extremely comfortable and I had the best sleep. Will definitely come back!",
  },
  {
    id: "review-4",
    author: "Michael L.",
    rating: "9.2/10 Exceptional",
    text: "Perfect for business travelers. The WiFi was fast and reliable, and the desk area in the room was spacious. The restaurant serves delicious food at reasonable prices.",
  },
];

export const mockHotelFAQs = [
  {
    id: "faq-1",
    question: "Does Regala Skycity Hotel by Regal Hotels have a pool?",
    answer: "Yes, this property has an outdoor pool. The pool is closed seasonally each year from November 1 to March 31.",
  },
  {
    id: "faq-2",
    question: "Is Regala Skycity Hotel by Regal Hotels pet-friendly?",
    answer: "Yes, the hotel is pet-friendly. There may be additional fees for bringing pets. Please contact the hotel for specific pet policies.",
  },
  {
    id: "faq-3",
    question: "How much is parking?",
    answer: "Self-parking is available for GBP 25 per day. Valet parking is available for GBP 35 per day.",
  },
  {
    id: "faq-4",
    question: "What time is check-in at Regala Skycity Hotel by Regal Hotels?",
    answer: "Check-in starts at 3:00 PM. Early check-in is available upon request, subject to availability.",
  },
  {
    id: "faq-5",
    question: "What time is check-out at Regala Skycity Hotel by Regal Hotels?",
    answer: "Check-out is at 11:00 AM. Late check-out may be available upon request for an additional fee.",
  },
  {
    id: "faq-6",
    question: "Does Regala Skycity Hotel by Regal Hotels provide a shuttle to the airport?",
    answer: "Yes, the hotel provides a complimentary airport shuttle service. Please contact the front desk to arrange your pickup.",
  },
  {
    id: "faq-7",
    question: "Where is Regala Skycity Hotel by Regal Hotels located?",
    answer: "The hotel is located at 72 Nathan Road in Kowloon, Hong Kong. It's conveniently close to AsiaWorld-Expo and Citygate Outlets.",
  },
];
