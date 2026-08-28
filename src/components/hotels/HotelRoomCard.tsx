"use client";

import {
    Bath,
    Bed,
    Building,
    Bus,
    Check,
    ChevronRight,
    Dumbbell,
    Maximize,
    PawPrint,
    Sparkles,
    Trees,
    Users,
    Wifi,
    Wind,
    X,
} from 'lucide-react';
import { Button } from '../ui/button';
import { Dispatch, SetStateAction, useMemo, useState, type ComponentType } from 'react';
import type { ViewRoomOption } from '@/types/holidayPackage';

type UnknownRecord = Record<string, unknown>;

export interface RoomAmenity {
    label: string;
    icon: string;
}

export interface RoomCardData {
    id: string;
    sourceRoomOptionId?: string;
    name: string;
    bedType: string;
    reviews: {
        score: number;
        label: string;
        count: number;
    };
    isRefundable: boolean;
    paymentType: string;
    amenities: RoomAmenity[];
    price: {
        currency: string;
        nightly: number;
        total: number;
    };
    _raw: UnknownRecord;
    roomGroupSources?: Record<string, ViewRoomOption>;
}

export function formatDisplayPrice(currency: string | undefined, amount: number | undefined): string {
    if (typeof amount !== 'number' || !Number.isFinite(amount)) return '';
    const normalizedCurrency = String(currency || '').trim().toUpperCase();
    if (/^[A-Z]{3}$/.test(normalizedCurrency)) {
        try {
            return new Intl.NumberFormat('en-GB', {
                style: 'currency',
                currency: normalizedCurrency,
                maximumFractionDigits: 2,
            }).format(amount);
        } catch {
            // Fall back to prefix formatting below.
        }
    }

    const prefix = String(currency || '').trim() || '£';
    return `${prefix}${amount.toLocaleString(undefined, {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    })}`;
}

const amenityIcons: Record<string, ComponentType<{ className?: string }>> = {
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
    group: Users,
    bed: Bed,
    nature: Trees,
    city: Building,
    bathtub: Bath,
    kitchen: Building,
};

export function getAmenityIcon(iconName: string) {
    const Icon = amenityIcons[iconName];
    return Icon ? <Icon className="w-[18px] h-[18px] text-[#010D50]" /> : null;
}

interface HotelRoomCardPropsType {
    room: RoomCardData;

    requiredRoomCount: number;

    selectedRoomCounts: Record<string, number>
    isPackageMode: boolean
    setSelectedRoomCounts: Dispatch<SetStateAction<Record<string, number>>>
    setActiveRoomCardId: Dispatch<SetStateAction<string | null>>
    activeRoomCardId: String | null;
    isHotelDatesDebugMode: boolean;
    minRoomPrice: number;
    convertedLocalTaxByRoomId: Record<string, string>
    handlePackageRoomContinue: (roomIds?: string[] | undefined) => void
    handleHotelRoomContinue: (roomIds?: string[] | undefined) => void
    allDeeplinkRoomPricesSame?: boolean;
    deeplinkRoomGroupKeys?: string[];
    deeplinkSelectedSlots?: Record<string, string>;
    deeplinkBaseSlotPrices?: Record<string, number>;
    onDeeplinkSlotToggle?: (roomId: string, groupKey: string) => void;
    rawRateBreakdown?: Record<string, Record<string, unknown>> | null;
}

function sanitizeHotelText(value: unknown): string {
    const text = String(value ?? "")
        .replace(/<br\s*\/?\s*>/gi, "\n")
        .replace(/<\/p>/gi, "\n")
        .replace(/<li[^>]*>/gi, "• ")
        .replace(/<\/li>/gi, "\n")
        .replace(/<[^>]+>/g, " ")
        .replace(/&nbsp;/gi, " ")
        .replace(/\r/g, "")
        .trim();
    return text
        .split("\n")
        .map((line) => line.replace(/\s+/g, " ").trim())
        .filter(Boolean)
        .join("\n\n");
}
function sanitizeRoomDisplayText(value: unknown): string {
    const text = sanitizeHotelText(value).replace(/\s+/g, " ").trim();
    if (!text) return "";

    const lettersOnly = text.replace(/[^A-Za-z]/g, "");
    const isAllCaps = lettersOnly.length > 0 && lettersOnly === lettersOnly.toUpperCase();
    if (!isAllCaps) return text;

    return text
        .toLowerCase()
        .replace(/\b[a-z]/g, (match) => match.toUpperCase())
        .replace(/\bAnd\b/g, "and")
        .replace(/\bOr\b/g, "or")
        .replace(/\bOf\b/g, "of");
}

function extractSlotLabel(groupKey: string): string {
    const match = groupKey.match(/(\d+)/);
    return match ? `Room ${match[1]}` : groupKey;
}

function countSelectedRooms(counts: Record<string, number>): number {
    return Object.values(counts).reduce((sum, count) => sum + Math.max(0, Number(count || 0)), 0);
}

export function HotelRoomCard({ room,
    isPackageMode,
    activeRoomCardId,
    setActiveRoomCardId,
    setSelectedRoomCounts,
    selectedRoomCounts,
    requiredRoomCount,
    minRoomPrice,
    isHotelDatesDebugMode,
    convertedLocalTaxByRoomId,
    handlePackageRoomContinue,
    handleHotelRoomContinue,
    allDeeplinkRoomPricesSame = true,
    deeplinkRoomGroupKeys = [],
    deeplinkSelectedSlots = {},
    deeplinkBaseSlotPrices = {},
    onDeeplinkSlotToggle,
    rawRateBreakdown,
}: HotelRoomCardPropsType) {
    const [expandedRoomInfoById, setExpandedRoomInfoById] = useState<Record<string, boolean>>({});

    const roomSelectionCount = Math.max(0, Number(selectedRoomCounts[room.id] || 0));
    const roomIsSelected = roomSelectionCount > 0;
    const isMultiRoomSelectionMode = requiredRoomCount > 1;
    const isActiveRoomCard = isPackageMode
        ? String(activeRoomCardId || "") === String(room.id)
        : isMultiRoomSelectionMode
            ? String(activeRoomCardId || "") === String(room.id)
            : roomIsSelected;
    const roomRaw = room._raw as Record<string, unknown>;
    console.log("roomRaw", roomRaw);
    const hbRaw = roomRaw._hotelbeds && typeof roomRaw._hotelbeds === "object"
        ? (roomRaw._hotelbeds as Record<string, unknown>)
        : null;
    const hbCancellationPolicies = Array.isArray(hbRaw?.cancellationPolicies)
        ? hbRaw.cancellationPolicies
        : [];
    const roomCode = String(roomRaw.room_code ?? roomRaw.roomCode ?? "").trim();
    const hbRateClass = String(hbRaw?.rateClass || "").trim();
    const hbOffers: any[] = Array.isArray(hbRaw?.offers) ? hbRaw.offers
        : [];
    const hbPromotions: any[] = Array.isArray(hbRaw?.promotions)
        ? hbRaw.promotions
        : [];
    const roomCancellationPolicy = sanitizeHotelText(room?._raw?.cancellation_policy ?? room?._raw?.cancellationPolicy);
    const hbCancellationSummary = (() => {
        const firstCancellation = hbCancellationPolicies[0] ?? null;
        if (!firstCancellation || typeof firstCancellation !== "object") return "";

        const cancellationRow = firstCancellation as Record<string, unknown>;
        return sanitizeHotelText(
            cancellationRow.policy ??
            cancellationRow.description ??
            cancellationRow.text
        );
    })();
    const roomCancellationSummary = roomCancellationPolicy || hbCancellationSummary;
    const roomCancellationSummaryShort =
        roomCancellationSummary.length > 240
            ? `${roomCancellationSummary.slice(0, 237)}...`
            : roomCancellationSummary;
    const hasMoreInfo =
        hbOffers.length > 0 ||
        hbPromotions.length > 0 ||
        (Array.isArray(room?.amenities) && room.amenities.length > 0);
    const expanded = !!expandedRoomInfoById[room.id];
    const selectedRoomCount = useMemo(() => countSelectedRooms(selectedRoomCounts), [selectedRoomCounts]);
    const handlePackageRoomActivate = () => {
        setActiveRoomCardId(String(room.id));
    };
    const handleMultiRoomCardSelect = () => {
        setActiveRoomCardId(String(room.id));
    };
    const handleSingleRoomCardSelect = () => {
        const roomId = String(room.id);
        setActiveRoomCardId(roomId);
        setSelectedRoomCounts({ [roomId]: 1 });
    };
    const isSingleRoomSelectionMode = !isPackageMode && requiredRoomCount === 1;

    const useDeeplinkSlotMode = isPackageMode && !allDeeplinkRoomPricesSame && deeplinkRoomGroupKeys.length > 0;

    const availableSlots = useMemo(() => {
        if (!useDeeplinkSlotMode) return [];
        const sources = room.roomGroupSources || {};
        return deeplinkRoomGroupKeys.filter((key) => sources[key]);
    }, [useDeeplinkSlotMode, deeplinkRoomGroupKeys, room.roomGroupSources]);

    const slotPrices = useMemo(() => {
        if (!useDeeplinkSlotMode || !room.roomGroupSources) return {};
        const out: Record<string, { total: number; currency: string }> = {};
        for (const groupKey of availableSlots) {
            const src = room.roomGroupSources[groupKey];
            if (!src) continue;
            const total = Number(src.cust_tot_sell_amt ?? src.net_price ?? 0);
            const currencyCode = String(src.sell_currency_code || src.currency_code || "GBP").toUpperCase();
            const currency = currencyCode === "GBP" ? "£" : currencyCode;
            out[groupKey] = { total, currency };
        }
        return out;
    }, [useDeeplinkSlotMode, availableSlots, room.roomGroupSources]);

    const debugBreakdownEntry = useMemo(() => {
        if (!rawRateBreakdown) return null;
        const entryKey = Object.keys(rawRateBreakdown)[0];
        if (!entryKey) return null;
        return rawRateBreakdown[entryKey];
    }, [rawRateBreakdown]);

    const debugSlotRoomIds = useMemo(() => {
        if (!debugBreakdownEntry) return {} as Record<string, string>;
        const out: Record<string, string> = {};
        for (const groupKey of deeplinkRoomGroupKeys) {
            const numMatch = groupKey.match(/\d+/);
            if (!numMatch) continue;
            const rawId = String(debugBreakdownEntry[`room${numMatch[0]}id`] || "").trim();
            if (rawId) out[groupKey] = rawId;
        }
        return out;
    }, [debugBreakdownEntry, deeplinkRoomGroupKeys]);

    return (
        <div
            key={room.id}
            className={[
                "border rounded-[32px] bg-white overflow-hidden flex flex-col h-full transform-gpu transition-all duration-200",
                isActiveRoomCard ? "border-[#3754ED] scale-[1.01] shadow-md" : "border-[#DFE0E4] scale-100",
                !useDeeplinkSlotMode && (isPackageMode || isMultiRoomSelectionMode || isSingleRoomSelectionMode)
                    ? "cursor-pointer hover:scale-[1.005] hover:shadow-md"
                    : "",
            ].join(" ")}
            role={!useDeeplinkSlotMode && (isPackageMode || isMultiRoomSelectionMode || isSingleRoomSelectionMode) ? "button" : undefined}
            tabIndex={!useDeeplinkSlotMode && (isPackageMode || isMultiRoomSelectionMode || isSingleRoomSelectionMode) ? 0 : undefined}
            onClick={
                !useDeeplinkSlotMode && isPackageMode
                    ? handlePackageRoomActivate
                    : !useDeeplinkSlotMode && isMultiRoomSelectionMode
                        ? handleMultiRoomCardSelect
                        : !useDeeplinkSlotMode && isSingleRoomSelectionMode
                            ? handleSingleRoomCardSelect
                            : undefined
            }
            onKeyDown={
                !useDeeplinkSlotMode && (isPackageMode || isMultiRoomSelectionMode || isSingleRoomSelectionMode)
                    ? (e) => {
                        if (e.key === "Enter" || e.key === " ") {
                            e.preventDefault();
                            if (isPackageMode) handlePackageRoomActivate();
                            else if (isMultiRoomSelectionMode) handleMultiRoomCardSelect();
                            else handleSingleRoomCardSelect();
                        }
                    }
                    : undefined
            }
        >
            {/* Room Info */}
            <div className="flex-1 p-6 flex flex-col">
                {/* Room Name & Bed Type */}
                <div className="space-y-2">
                    <h3 className="text-lg font-semibold text-[#010D50]">
                        {sanitizeRoomDisplayText(room.name)}
                    </h3>
                    <p className="text-sm text-[#3A478A]">{sanitizeRoomDisplayText(room.bedType)}</p>
                    {(roomCode || hbRateClass) && (
                        <p className="text-xs text-[#3A478A]">
                            {roomCode ? `Code: ${roomCode}` : ""}
                            {roomCode && hbRateClass ? " · " : ""}
                            {hbRateClass ? `Rate: ${hbRateClass}` : ""}
                        </p>
                    )}
                </div>

                {(room.reviews.score > 0 || room.reviews.count > 0) && (
                    <div className="flex items-center gap-2 mt-4">
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
                )}

                <div className="flex flex-wrap gap-2 mt-4">
                    {room.isRefundable ?
                        (<div className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs bg-green-100 text-green-700"
                        `}>
                            <Check className="w-3.5 h-3.5" />
                            Refundable
                        </div>) :
                        (<div className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs
                        bg-[rgba(0,0,0,0.08)] text-[#FF1414]
                        }`}>
                            <X className="w-3.5 h-3.5" />
                            Non-refundable
                        </div>)
                    }
                </div>
                {!isPackageMode && roomCancellationSummaryShort && (
                    <p className="mt-3 text-xs text-[#3A478A] leading-relaxed">
                        {roomCancellationSummaryShort}
                    </p>
                )}

                {/* Room Amenities */}
                <div className="flex flex-wrap gap-2 mt-4">
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

                {hasMoreInfo && (
                    <button
                        type="button"
                        className="mt-4 text-sm text-[#3754ED] font-medium text-left"
                        onClick={(e) => {
                            e.stopPropagation();
                            setExpandedRoomInfoById((prev) => ({ ...prev, [room.id]: !prev[room.id] }));
                        }}
                    >
                        {expanded ? "Hide details" : "More"}
                    </button>
                )}

                {hasMoreInfo && expanded && (
                    <div className="mt-3 space-y-3">
                        {(hbPromotions.length > 0 || hbOffers.length > 0) && (
                            <div className="space-y-1">
                                <div className="text-xs font-semibold text-[#010D50]">Notes</div>
                                {hbPromotions.length > 0 && (
                                    <div className="text-xs text-[#3A478A]">
                                        Promotions: {hbPromotions.length}
                                    </div>
                                )}
                                {hbOffers.length > 0 && (
                                    <div className="text-xs text-[#3A478A]">
                                        Offers: {hbOffers.length}
                                    </div>
                                )}
                            </div>
                        )}
                        {Array.isArray(room?.amenities) && room.amenities.length > 5 && (
                            <div className="text-xs text-[#3A478A]">
                                +{room.amenities.length - 5} more amenities
                            </div>
                        )}
                    </div>
                )}

                {isHotelDatesDebugMode && (
                    <details
                        className="mt-4 rounded-lg border border-yellow-200 bg-yellow-50 p-2"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <summary className="cursor-pointer text-xs font-semibold text-yellow-800">
                            🔧 Room Raw Data
                        </summary>
                        <pre
                            className="mt-2 max-h-72 overflow-auto whitespace-pre-wrap break-all rounded bg-yellow-100 p-2 text-[10px] text-yellow-900"
                            onWheel={(e) => e.stopPropagation()}
                            onTouchMove={(e) => e.stopPropagation()}
                        >
                            {JSON.stringify(room?._raw ?? room, null, 2)}
                        </pre>
                    </details>
                )}

                 {isHotelDatesDebugMode && debugBreakdownEntry && Object.keys(debugSlotRoomIds).length > 0 && (
                     <div className="mt-3 p-2 bg-yellow-50 border border-yellow-200 rounded text-xs font-mono space-y-1" onClick={(e) => e.stopPropagation()}>
                        <div className="font-semibold text-yellow-800 mb-1">🔧 Rate Breakdown IDs</div>
                        {Object.entries(debugSlotRoomIds).map(([groupKey, rawId]) => {
                            const srcOption = room.roomGroupSources?.[groupKey];
                            const srcId = srcOption ? String((srcOption as unknown as Record<string, unknown>).id ?? "") : "";
                            const matchesThisRoom = rawId === room.id || rawId === room.sourceRoomOptionId || rawId === srcId;
                             return (
                                <div key={groupKey} className="flex flex-col gap-0.5">
                                    <div className={`flex gap-2 ${matchesThisRoom ? "text-yellow-900 font-bold" : "text-yellow-700"}`}>
                                        <span className="font-semibold text-yellow-800">{groupKey.replace(/options$/i, "id")}:</span>
                                        <span>{rawId}</span>
                                        {matchesThisRoom && <span className="text-green-700">← this room</span>}
                                    </div>
                                    {srcId && <span className="pl-4 text-yellow-600">option.id: {srcId}</span>}
                                 </div>
                             );
                         })}
                        {debugBreakdownEntry.total_price != null && (
                            <div className="flex gap-2 text-yellow-900 pt-1 border-t border-yellow-200 mt-1">
                                <span className="font-semibold text-yellow-800">total_price:</span>
                                <span>{String(debugBreakdownEntry.total_price)}</span>
                            </div>
                        )}
                        {debugBreakdownEntry.flight_price != null && (
                            <div className="flex gap-2 text-yellow-900">
                                <span className="font-semibold text-yellow-800">flight_price:</span>
                                <span>{String(debugBreakdownEntry.flight_price)}</span>
                            </div>
                        )}
                    </div>
                )}

                {/* Pricing & CTA */}
                <div className="mt-auto pt-6 space-y-4">
                    <div className="flex flex-col items-end gap-1">
                        {isPackageMode && (
                            <span className="text-xs font-medium text-[#008234]">
                                ✓ Return Flights Included
                            </span>
                        )}
                        {isPackageMode ? (
                            useDeeplinkSlotMode ? (
                                <div className="w-full space-y-2 mt-1">
                                    {availableSlots.map((groupKey) => {
                                        const priceInfo = slotPrices[groupKey];
                                        const isSelected = deeplinkSelectedSlots[groupKey] === room.id;
                                        const basePrice = deeplinkBaseSlotPrices[groupKey] ?? 0;
                                        const delta = priceInfo ? priceInfo.total - basePrice : 0;
                                        return (
                                            <div
                                                key={groupKey}
                                                className={`flex items-center justify-between gap-2 rounded-xl px-3 py-2 border ${isSelected ? "border-[#3754ED] bg-[#F5F7FF]" : "border-[#DFE0E4] bg-white"}`}
                                                onClick={(e) => e.stopPropagation()}
                                            >
                                                <label className="flex items-center gap-2 text-sm cursor-pointer select-none">
                                                    <input
                                                        type="checkbox"
                                                        checked={isSelected}
                                                        className="accent-[#3754ED] w-4 h-4 rounded border-[#DFE0E4]"
                                                        onChange={() => {
                                                            if (onDeeplinkSlotToggle) {
                                                                onDeeplinkSlotToggle(room.id, groupKey);
                                                            }
                                                        }}
                                                    />
                                                    <span className="text-sm text-[#010D50] font-medium">
                                                        {extractSlotLabel(groupKey)}
                                                    </span>
                                                </label>
                                                {isHotelDatesDebugMode && (() => {
                                                    const srcOption = room.roomGroupSources?.[groupKey];
                                                    const srcId = srcOption ? String((srcOption as unknown as Record<string, unknown>).id ?? "") : "";
                                                    return srcId ? (
                                                        <span className="text-[9px] font-mono text-yellow-700 bg-yellow-50 px-1 rounded">
                                                            {srcId}
                                                        </span>
                                                    ) : null;
                                                })()}
                                                {priceInfo && (
                                                    <span className={`text-sm font-semibold ${isSelected ? "text-[#008234]" : "text-[#010D50]"}`}>
                                                        {Math.abs(delta) < 0.01
                                                            ? formatDisplayPrice(priceInfo.currency, 0)
                                                            : delta < 0
                                                                ? `-${priceInfo.currency}${Math.abs(delta).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                                                                : `+${priceInfo.currency}${delta.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
                                                    </span>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                            ) : (
                                (() => {
                                    const delta = room.price.total - minRoomPrice;
                                    if (Math.abs(delta) < 0.01) {
                                        return (
                                            <span className="text-xl font-semibold text-[#008234]">
                                                {formatDisplayPrice(room.price.currency, 0)}
                                            </span>
                                        );
                                    }
                                    return (
                                        <span className="text-xl font-semibold text-[#010D50]">
                                            {delta < 0 ? '-' : '+'}{room.price.currency}{Math.abs(delta).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                        </span>
                                    );
                                })()
                            )
                        ) : (
                            <>
                                <span className="text-base text-[#010D50]">
                                    {room.price.currency}{room.price.nightly.toLocaleString()} nightly
                                </span>
                                <span className="text-xl font-semibold text-[#010D50]">
                                    {room.price.currency}{room.price.total.toLocaleString()} total
                                </span>
                            </>
                        )}
                        {(() => {
                            const rawForTax = room._raw as Record<string, unknown>;
                            const hbTaxes = (rawForTax.hotelBedsTaxes ?? (rawForTax._hotelbeds as any)?.taxes) as
                                import('@/types/hotel').HotelTaxBreakdown | null | undefined;
                            const notIncluded = hbTaxes?.taxes?.filter(t => !t.included) ?? [];
                            const convertedLabel = convertedLocalTaxByRoomId[room.id];
                            if (notIncluded.length > 0 && convertedLabel) {
                                return (
                                    <span className="text-xs text-[#B07930] bg-[#FFF8F0] border border-[#F5D9B3] rounded px-2 py-0.5">
                                        {convertedLabel}
                                    </span>
                                );
                            }
                            return null;
                        })()}
                    </div>

                    {useDeeplinkSlotMode ? (
                        <Button
                            className="w-full rounded-full py-3 h-auto gap-2 bg-[#3754ED] hover:bg-[#2A3FB8] text-white font-bold"
                            onClick={(e) => {
                                e.stopPropagation();
                                handlePackageRoomContinue();
                            }}
                        >
                            Continue Booking
                            <ChevronRight className="w-5 h-5" />
                        </Button>
                    ) : isPackageMode && requiredRoomCount === 1 ? (
                        <Button
                            className="w-full rounded-full py-3 h-auto gap-2 bg-[#3754ED] hover:bg-[#2A3FB8] text-white font-bold"
                            onClick={(e) => {
                                e.stopPropagation();
                                const roomId = String(room.id);
                                setActiveRoomCardId(roomId);
                                setSelectedRoomCounts({ [roomId]: 1 });
                                handlePackageRoomContinue([roomId]);
                            }}
                        >
                            Continue Booking
                            <ChevronRight className="w-5 h-5" />
                        </Button>
                    ) : requiredRoomCount === 1 ? (
                        <Button
                            className="w-full rounded-full py-3 h-auto gap-2 bg-[#3754ED] hover:bg-[#2A3FB8] text-white font-bold"
                            onClick={(e) => {
                                e.stopPropagation();
                                const roomId = String(room.id);
                                setActiveRoomCardId(roomId);
                                setSelectedRoomCounts({ [roomId]: 1 });
                                handleHotelRoomContinue([roomId])
                            }}
                        >
                            Reserve
                            <ChevronRight className="w-5 h-5" />
                        </Button>
                    ) : (
                        <div className="w-full flex items-center justify-between rounded-full border border-[#DFE0E4] px-3 py-2">
                            <Button
                                variant="ghost"
                                className="h-8 w-8 p-0 rounded-full"
                                disabled={roomSelectionCount === 0}
                                onClick={(e) => {
                                    e.stopPropagation();
                                    setSelectedRoomCounts((prev) => {
                                        const current = Math.max(0, Number(prev[room.id] || 0));
                                        if (current <= 0) return prev;
                                        const next = { ...prev };
                                        if (current === 1) delete next[room.id];
                                        else next[room.id] = current - 1;
                                        return next;
                                    });
                                }}
                            >
                                −
                            </Button>
                            <span className="text-sm font-semibold text-[#010D50]">{roomSelectionCount}</span>
                            <Button
                                variant="ghost"
                                className="h-8 w-8 p-0 rounded-full"
                                disabled={selectedRoomCount >= requiredRoomCount}
                                onClick={(e) => {
                                    e.stopPropagation();
                                    setSelectedRoomCounts((prev) => {
                                        if (countSelectedRooms(prev) >= requiredRoomCount) return prev;
                                        const current = Math.max(0, Number(prev[room.id] || 0));
                                        return { ...prev, [room.id]: current + 1 };
                                    });
                                }}
                            >
                                +
                            </Button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
