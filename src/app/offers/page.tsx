import Navbar from "@/components/navigation/Navbar";
import { Tag, Plane, Calendar } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function OffersPage() {
  const offers = [
    {
      id: 1,
      title: "Summer Special",
      description: "Get up to 30% off on all international flights",
      discount: "30% OFF",
      validUntil: "Valid until Dec 31, 2024",
      route: "London to Dubai",
      price: "£399",
      image: "bg-gradient-to-br from-orange-400 to-red-500",
    },
    {
      id: 2,
      title: "Weekend Getaway",
      description: "Book your weekend flights and save big",
      discount: "25% OFF",
      validUntil: "Valid until Nov 30, 2024",
      route: "London to Paris",
      price: "£89",
      image: "bg-gradient-to-br from-blue-400 to-indigo-500",
    },
    {
      id: 3,
      title: "Family Package",
      description: "Special rates for family bookings of 4 or more",
      discount: "40% OFF",
      validUntil: "Valid until Jan 15, 2025",
      route: "London to New York",
      price: "£599",
      image: "bg-gradient-to-br from-green-400 to-teal-500",
    },
    {
      id: 4,
      title: "Business Class Upgrade",
      description: "Upgrade to business class at 50% off",
      discount: "50% OFF",
      validUntil: "Valid until Oct 31, 2024",
      route: "Any Route",
      price: "From £799",
      image: "bg-gradient-to-br from-purple-400 to-pink-500",
    },
    {
      id: 5,
      title: "Last Minute Deals",
      description: "Book within 48 hours and save",
      discount: "20% OFF",
      validUntil: "Limited Time Only",
      route: "Selected Routes",
      price: "From £149",
      image: "bg-gradient-to-br from-yellow-400 to-orange-500",
    },
    {
      id: 6,
      title: "Student Discount",
      description: "Special rates for students with valid ID",
      discount: "15% OFF",
      validUntil: "Valid all year",
      route: "All Routes",
      price: "Varies",
      image: "bg-gradient-to-br from-cyan-400 to-blue-500",
    },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white">
      <Navbar />
      
      <main className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 xl:px-12 py-12 sm:py-16 lg:py-20">
        <div className="text-center mb-10 sm:mb-12">
          <div className="flex items-center justify-center gap-3 mb-4">
            <Tag className="w-8 h-8 sm:w-10 sm:h-10 text-[#3754ED]" />
            <h1 className="text-3xl sm:text-5xl font-bold text-[#010D50]">
              Special Offers
            </h1>
          </div>
          <p className="text-base sm:text-lg lg:text-xl text-[#3A478A]">
            Exclusive deals and discounts on flights worldwide
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-12">
          {offers.map((offer) => (
            <div
              key={offer.id}
              className="bg-white rounded-2xl shadow-md border border-[#DFE0E4] overflow-hidden hover:shadow-lg transition-shadow"
            >
              <div className={`${offer.image} h-40 flex items-center justify-center`}>
                <div className="text-white text-center">
                  <Plane className="w-12 h-12 mx-auto mb-2" />
                  <span className="text-4xl font-bold">{offer.discount}</span>
                </div>
              </div>
              
              <div className="p-6">
                <h3 className="text-2xl font-bold text-[#010D50] mb-2">
                  {offer.title}
                </h3>
                <p className="text-[#3A478A] mb-4">{offer.description}</p>
                
                <div className="flex items-center gap-2 text-sm text-[#3A478A] mb-4">
                  <Calendar className="w-4 h-4" />
                  <span>{offer.validUntil}</span>
                </div>

                <div className="border-t border-[#DFE0E4] pt-4 mb-4">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-sm text-[#3A478A]">{offer.route}</span>
                    <span className="text-2xl font-bold text-[#3754ED]">
                      {offer.price}
                    </span>
                  </div>
                </div>

                <Button className="w-full bg-[#3754ED] hover:bg-[#2A3FB8] text-white py-6 rounded-lg text-lg font-semibold">
                  Book Now
                </Button>
              </div>
            </div>
          ))}
        </div>

        <div className="bg-white p-6 sm:p-8 rounded-2xl shadow-md border border-[#DFE0E4] text-center">
          <h2 className="text-2xl sm:text-3xl font-bold text-[#010D50] mb-4">
            Don&apos;t Miss Out!
          </h2>
          <p className="text-base sm:text-lg text-[#3A478A] mb-6">
            Subscribe to our newsletter and be the first to know about exclusive deals and offers
          </p>
          <div className="flex flex-col sm:flex-row gap-4 max-w-md mx-auto">
            <input
              type="email"
              placeholder="Enter your email"
              className="flex-1 px-4 py-3 border border-[#DFE0E4] rounded-lg focus:ring-2 focus:ring-[#3754ED] focus:border-transparent outline-none"
            />
            <Button className="bg-[#3754ED] hover:bg-[#2A3FB8] text-white px-8 py-3 rounded-lg font-semibold sm:w-auto w-full">
              Subscribe
            </Button>
          </div>
        </div>
      </main>
    </div>
  );
}

