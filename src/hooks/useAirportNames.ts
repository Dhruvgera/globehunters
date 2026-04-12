"use client";

import { useState, useEffect } from "react";
import { airportCache } from "@/lib/cache/airportCache";
import { shortenAirportName } from "@/lib/vyspa/utils";
import { getJourneySegments } from "@/lib/flight/segments";
import type { Flight, FlightSegment, IndividualFlight } from "@/types/flight";

export function useAirportNames(flight: Flight | null) {
  const [airportNames, setAirportNames] = useState<Record<string, string>>({});

  useEffect(() => {
    const loadAirportNames = async () => {
      await airportCache.getAirports();
      if (flight) {
        const codes = new Set<string>();
        const segments = getJourneySegments(flight);

        segments.forEach((seg: FlightSegment) => {
          if (seg) {
            codes.add(seg.departureAirport.code);
            codes.add(seg.arrivalAirport.code);
            if (seg.individualFlights) {
              seg.individualFlights.forEach((f: IndividualFlight) => {
                if (f.departureAirport) codes.add(f.departureAirport);
                if (f.arrivalAirport) codes.add(f.arrivalAirport);
              });
            }
          }
        });

        const nameMap: Record<string, string> = {};
        codes.forEach((code) => {
          nameMap[code] = airportCache.getAirportName(code);
        });
        setAirportNames(nameMap);
      }
    };

    loadAirportNames();
  }, [flight]);

  const getAirportName = (code: string, fallbackName?: string, city?: string): string => {
    const cached = airportNames[code];
    if (cached && cached !== code) return shortenAirportName(cached);
    if (fallbackName && fallbackName !== code) return shortenAirportName(fallbackName);
    if (city && city !== code) return shortenAirportName(city);
    return code;
  };

  const getCityName = (code: string): string => {
    const airport = airportCache.getAirportByCode(code);
    if (airport?.city && airport.city !== code) {
      return airport.city;
    }
    if (airport?.name && airport.name !== code) {
      return shortenAirportName(airport.name);
    }
    return code;
  };

  return { airportNames, getAirportName, getCityName, shortenAirportName };
}
