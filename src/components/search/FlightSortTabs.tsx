"use client";

import { useMemo } from "react";
import { Flight } from "@/types/flight";
import { sortFlights, parseDurationToMinutes, formatDuration, SortOption } from "@/utils/flightFilter";
import { cn } from "@/lib/utils";
import { useTranslations } from "next-intl";

interface FlightSortTabsProps {
    flights: Flight[];
    activeTab: 'cheapest' | 'best' | 'fastest';
    onTabChange: (tab: 'cheapest' | 'best' | 'fastest') => void;
}

export function FlightSortTabs({
    flights,
    activeTab,
    onTabChange,
}: FlightSortTabsProps) {
    const t = useTranslations('search.sort');
    const stats = useMemo(() => {
        if (flights.length === 0) return null;

        // Get cheapest
        const cheapestFlight = [...flights].sort((a, b) => a.price - b.price)[0];

        // Get fastest
        const fastestFlight = [...flights].sort((a, b) => {
            const durationA = parseDurationToMinutes(a.outbound.duration) + (a.inbound ? parseDurationToMinutes(a.inbound.duration) : 0);
            const durationB = parseDurationToMinutes(b.outbound.duration) + (b.inbound ? parseDurationToMinutes(b.inbound.duration) : 0);
            return durationA - durationB;
        })[0];

        // Get best
        const bestFlight = sortFlights(flights, 'best')[0];

        return {
            cheapest: {
                price: cheapestFlight.price,
                duration: parseDurationToMinutes(cheapestFlight.outbound.duration) + (cheapestFlight.inbound ? parseDurationToMinutes(cheapestFlight.inbound.duration) : 0),
            },
            fastest: {
                price: fastestFlight.price,
                duration: parseDurationToMinutes(fastestFlight.outbound.duration) + (fastestFlight.inbound ? parseDurationToMinutes(fastestFlight.inbound.duration) : 0),
            },
            best: {
                price: bestFlight.price,
                duration: parseDurationToMinutes(bestFlight.outbound.duration) + (bestFlight.inbound ? parseDurationToMinutes(bestFlight.inbound.duration) : 0),
            }
        };
    }, [flights]);

    if (!stats || flights.length === 0) return null;

    const tabs = [
        {
            id: 'cheapest' as const,
            label: t('cheapest'),
            price: stats.cheapest.price,
            duration: stats.cheapest.duration,
        },
        {
            id: 'best' as const,
            label: t('best'),
            price: stats.best.price,
            duration: stats.best.duration,
        },
        {
            id: 'fastest' as const,
            label: t('fastest'),
            price: stats.fastest.price,
            duration: stats.fastest.duration,
        },
    ];

    return (
        <div className="grid grid-cols-3 gap-0 mb-4 bg-white border border-gray-200 rounded-lg overflow-hidden shadow-sm">
            {tabs.map((tab) => (
                <button
                    key={tab.id}
                    onClick={() => onTabChange(tab.id)}
                    className={cn(
                        "flex flex-col items-center justify-center py-3 px-2 transition-all border-b-2",
                        activeTab === tab.id
                            ? "bg-[#F5F7FF] border-[#3754ED] text-[#3754ED]"
                            : "bg-white border-transparent text-gray-500 hover:bg-gray-50"
                    )}
                >
                    <span className={cn(
                        "text-xs font-bold uppercase tracking-wider mb-1",
                        activeTab === tab.id ? "text-[#3754ED]" : "text-gray-400"
                    )}>
                        {tab.label}
                    </span>
                    <span className="text-lg font-bold">
                        £{Math.round(tab.price)}
                    </span>
                    <span className="text-xs">
                        {formatDuration(tab.duration)}
                    </span>
                </button>
            ))}
        </div>
    );
}
