import type { Flight, FlightSegment } from "@/types/flight";
import type { HolidayFlightDirection, PackageSearchResult, TransformedAlternateFlight, TransformedFlightLeg } from "@/types/holidayPackage";
import { getCurrencySymbol } from "@/lib/currency/converter";
import { formatDuration } from "@/lib/vyspa/utils";
import { buildFlightFilters } from "@/lib/utils/filterBuilder";


function formatClock(value: unknown): string {
  const raw = String(value ?? "").trim();
  const digits = raw.replace(/\D/g, "").padStart(4, "0").slice(-4);
  return `${digits.slice(0, 2)}:${digits.slice(2)}`;
}

function formatDateLabel(isoDate: unknown): string {
  const value = String(isoDate || "").slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return String(isoDate || "");
  const date = new Date(`${value}T12:00:00`);
  if (Number.isNaN(date.getTime())) return value;
  return date
    .toLocaleDateString("en-GB", {
      weekday: "short",
      day: "numeric",
      month: "short",
      year: "2-digit",
    })
    .toUpperCase();
}


function getDirectionFlights(direction: HolidayFlightDirection | undefined): Array<Record<string, unknown>> {
  const rawDirection = direction as unknown as { Flights?: unknown[]; flights?: unknown[] } | undefined;
  if (!rawDirection) return [];
  if (Array.isArray(rawDirection.Flights)) return rawDirection.Flights as Array<Record<string, unknown>>;
  if (Array.isArray(rawDirection.flights)) return rawDirection.flights as Array<Record<string, unknown>>;
  return [];
}

function buildLayovers(flights: Array<Record<string, unknown>>) {
  const layovers: Array<{ viaAirport: string; duration: string }> = [];

  for (let index = 0; index < flights.length - 1; index += 1) {
    const current = flights[index];
    const next = flights[index + 1];
    const currentArrivalDate = String(current.arrival_date || "");
    const currentArrivalTime = formatClock(current.arrival_time);
    const nextDepartureDate = String(next.departure_date || "");
    const nextDepartureTime = formatClock(next.departure_time);
    const currentDateTime = new Date(`${currentArrivalDate}T${currentArrivalTime}:00`);
    const nextDateTime = new Date(`${nextDepartureDate}T${nextDepartureTime}:00`);
    const diffMinutes = Number.isNaN(currentDateTime.getTime()) || Number.isNaN(nextDateTime.getTime())
      ? 0
      : Math.max(0, Math.round((nextDateTime.getTime() - currentDateTime.getTime()) / 60000));

    layovers.push({
      viaAirport: String(current.arrival_airport || ""),
      duration: formatDuration(diffMinutes),
    });
  }

  return layovers;
}

function mapDirectionToSegment(direction: HolidayFlightDirection | undefined): FlightSegment | null {
  const flights = getDirectionFlights(direction);
  if (flights.length === 0) return null;

  const rawDirection = direction as unknown as { Segment_number?: number; Route?: string; Flying_time?: number; Total_travel_time?: number; Stops?: number };
  const first = flights[0];
  const last = flights[flights.length - 1];
  const layovers = buildLayovers(flights);

  return {
    departureTime: formatClock(first.departure_time),
    arrivalTime: formatClock(last.arrival_time),
    departureAirport: {
      code: String(first.departure_airport || ""),
      name: String(first.departure_airport || ""),
      city: String(first.departure_airport || ""),
    },
    arrivalAirport: {
      code: String(last.arrival_airport || ""),
      name: String(last.arrival_airport || ""),
      city: String(last.arrival_airport || ""),
    },
    date: formatDateLabel(first.departure_date),
    arrivalDate: formatDateLabel(last.arrival_date || last.departure_date),
    duration: formatDuration(Number(rawDirection.Flying_time || 0)),
    totalJourneyTime: formatDuration(Number(rawDirection.Total_travel_time || rawDirection.Flying_time || 0)),
    stops: Math.max(0, Number(rawDirection.Stops ?? flights.length - 1) || 0),
    stopDetails:
      Math.max(0, Number(rawDirection.Stops ?? flights.length - 1) || 0) === 0
        ? "Direct"
        : `${Math.max(0, Number(rawDirection.Stops ?? flights.length - 1) || 0)} Stop${Math.max(0, Number(rawDirection.Stops ?? flights.length - 1) || 0) === 1 ? "" : "s"}`,
    layovers,
    carrierCode: String(first.airline_code || ""),
    carrierName: String(first.airline_name || ""),
    flightNumber: String(first.flight_number || ""),
    cabinClass: String(first.class_name || first.cabin_class || ""),
    aircraftType: String(first.aircraft_type || ""),
    distance: Number(first.distance || 0) || undefined,
    departureTerminal: String(first.departure_terminal || "") || undefined,
    arrivalTerminal: String(last.arrival_terminal || "") || undefined,
    individualFlights: flights.map((flight) => ({
      departureAirport: String(flight.departure_airport || ""),
      arrivalAirport: String(flight.arrival_airport || ""),
      departureTime: formatClock(flight.departure_time),
      arrivalTime: formatClock(flight.arrival_time),
      duration: formatDuration(Number(flight.travel_time || 0)),
      flightNumber: String(flight.flight_number || ""),
      carrierCode: String(flight.airline_code || ""),
      departureDate: String(flight.departure_date || ""),
      arrivalDate: String(flight.arrival_date || ""),
    })),
    segmentBaggage: String(first.baggage || first.Baggage || "") || undefined,
  };
}

function mapTransformedLegToSegment(leg: TransformedFlightLeg | undefined): FlightSegment | null {
  const flights = leg?.segments || [];
  if (flights.length === 0) return null;

  const first = flights[0];
  const last = flights[flights.length - 1];
  const stops = Math.max(0, flights.length - 1);

  return {
    departureTime: formatClock(first.departureTime),
    arrivalTime: formatClock(last.arrivalTime),
    departureAirport: {
      code: first.departureAirport,
      name: first.departureAirport,
      city: first.departureAirport,
    },
    arrivalAirport: {
      code: last.arrivalAirport,
      name: last.arrivalAirport,
      city: last.arrivalAirport,
    },
    date: formatDateLabel(first.departureDate),
    arrivalDate: formatDateLabel(last.arrivalDate || last.departureDate),
    duration: formatDuration(Number(leg?.duration || 0)),
    totalJourneyTime: formatDuration(Number(leg?.duration || 0)),
    stops,
    stopDetails: stops === 0 ? "Direct" : `${stops} Stop${stops === 1 ? "" : "s"}`,
    layovers: [],
    carrierCode: first.airlineCode,
    carrierName: first.airlineName,
    flightNumber: String(first.flightNumber || ""),
    cabinClass: first.cabinClass || "",
    individualFlights: flights.map((flight) => ({
      departureAirport: flight.departureAirport,
      arrivalAirport: flight.arrivalAirport,
      departureTime: formatClock(flight.departureTime),
      arrivalTime: formatClock(flight.arrivalTime),
      duration: formatDuration(Number(flight.travelTime || 0)),
      flightNumber: String(flight.flightNumber || ""),
      carrierCode: flight.airlineCode,
      departureDate: flight.departureDate,
      arrivalDate: flight.arrivalDate,
    })),
    segmentBaggage: first.baggage,
  };
}

export function mapPackageSearchResultFlightToFlight(
  pkg: PackageSearchResult | undefined,
  resultId: string,
  webRef?: string
): Flight | null {
  const outbound = mapTransformedLegToSegment(pkg?.flight?.outbound);
  const inbound = mapTransformedLegToSegment(pkg?.flight?.inbound);

  if (!pkg || !resultId || !outbound) return null;

  const price = Number(pkg.startingPrice || 0);

  return {
    id: resultId,
    airline: {
      name: outbound.carrierName || "Selected Airline",
      logo: "",
      code: outbound.carrierCode || "",
    },
    outbound,
    inbound: inbound || undefined,
    segments: [outbound, ...(inbound ? [inbound] : [])],
    tripType: inbound ? "round-trip" : "one-way",
    price,
    pricePerPerson: price,
    currency: getCurrencySymbol(pkg.currency || "GBP"),
    packagePriceDeltaTotal: 0,
    packagePriceDeltaPerPerson: 0,
    ticketOptions: [],
    webRef,
    baggage: outbound.segmentBaggage,
    refundable: null,
    hasBaggage: Boolean(outbound.segmentBaggage),
    segmentResultId: resultId,
  };
}

export function mapPackageAlternateFlightToFlight(
  flight: TransformedAlternateFlight,
  webRef?: string
): Flight | null {
  const outbound = mapDirectionToSegment(flight.segments?.[0]);
  const inbound = mapDirectionToSegment(flight.segments?.[1]);

  if (!outbound) return null;

  return {
    id: flight.resultId,
    airline: {
      name: flight.airlineName || outbound.carrierName || "Selected Airline",
      logo: "",
      code: flight.airlineCode || outbound.carrierCode || "",
    },
    outbound,
    inbound: inbound || undefined,
    segments: [outbound, ...(inbound ? [inbound] : [])],
    tripType: inbound ? "round-trip" : "one-way",
    price: Number(flight.totalFare || 0),
    pricePerPerson: Number(flight.totalFare || 0),
    currency: getCurrencySymbol(flight.currency || 'GBP'),
    packagePriceDeltaTotal: Number(flight.priceDifference || 0),
    packagePriceDeltaPerPerson:
      typeof flight.priceDifferencePerPerson === "number"
        ? Number(flight.priceDifferencePerPerson)
        : undefined,
    ticketOptions: [],
    webRef,
    baggage: flight.baggage,
    refundable: flight.refundableText ? !/non[- ]?refundable/i.test(flight.refundableText) : null,
    refundableText: flight.refundableText,
    hasBaggage: Boolean(flight.baggage),
    segmentResultId: flight.resultId,
    moduleId: flight.moduleId != null ? String(flight.moduleId) : undefined,
    gds: flight.gds,
  };
}

export function buildPackageFlightFilters(flights: Flight[]) {
  const filterResult = buildFlightFilters(flights, (f) => Number(f.price || 0));

  return {
    airlines: Array.from(filterResult.airlines.values()),
    departureAirports: Array.from(filterResult.departureAirports.values()),
    arrivalAirports: Array.from(filterResult.arrivalAirports.values()),
    minPrice: filterResult.priceRange.min,
    maxPrice: filterResult.priceRange.max,
  };
}
