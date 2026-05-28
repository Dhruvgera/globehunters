// Show loading state when processing deeplink

import { Bed, Hotel, Loader2, Plane } from "lucide-react";
import Navbar from "../navigation/Navbar";



export function DeeplinkLoader({ deeplinkType }: { deeplinkType: "flight" | "package" | "hotel" | null }) {
    if (deeplinkType === null) {
        return;
    }

    return (
        <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white">
            <Navbar />
            <div className="flex flex-col items-center justify-center min-h-[60vh] px-4">
                <div className="bg-white rounded-2xl shadow-lg p-8 max-w-md w-full text-center">
                    <div className="relative mb-6">
                        <div className="w-20 h-20 mx-auto bg-[rgba(55,84,237,0.1)] rounded-full flex items-center justify-center">
                            {deeplinkType === "flight" && <Plane className="w-10 h-10 text-[#3754ED] animate-pulse" />}
                            {deeplinkType === "package" && (<><Plane className="w-10 h-10 text-[#3754ED] animate-pulse" />
                                <Bed className="w-10 h-10 text-[#3754ED] animate-pulse" /></>)}
                            {deeplinkType === "hotel" && <Hotel className="w-10 h-10 text-[#3754ED] animate-pulse" />}
                        </div>
                        <div className="absolute inset-0 flex items-center justify-center">
                            <Loader2 className="w-24 h-24 text-[#3754ED]/20 animate-spin" />
                        </div>
                    </div>
                    <h1 className="text-2xl font-bold text-[#010D50] mb-3">
                        Loading Your {deeplinkType}
                    </h1>
                    <p className="text-[#3A478A]">
                        Please wait while we retrieve your selected {deeplinkType} details...
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
