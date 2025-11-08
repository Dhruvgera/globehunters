/**
 * Airport Search Utilities
 * Search and filter logic for airports
 */

import type { Airport, AirportSearchResult } from '@/types/airport';

/**
 * Calculate match score for airport based on query
 */
function calculateMatchScore(airport: Airport, query: string): {
  score: number;
  matchedFields: string[];
} {
  const q = query.toLowerCase().trim();
  if (!q) return { score: 0, matchedFields: [] };

  const code = airport.code.toLowerCase();
  const city = airport.city.toLowerCase();
  const country = airport.country.toLowerCase();

  let score = 0;
  const matchedFields: string[] = [];

  // Exact code match (highest priority)
  if (code === q) {
    score += 100;
    matchedFields.push('code');
  }
  // Code starts with query
  else if (code.startsWith(q)) {
    score += 90;
    matchedFields.push('code');
  }
  // Code contains query
  else if (code.includes(q)) {
    score += 70;
    matchedFields.push('code');
  }

  // City exact match
  if (city === q) {
    score += 80;
    matchedFields.push('city');
  }
  // City starts with query
  else if (city.startsWith(q)) {
    score += 70;
    matchedFields.push('city');
  }
  // City contains query
  else if (city.includes(q)) {
    score += 50;
    matchedFields.push('city');
  }

  // Country match
  if (country.includes(q)) {
    score += 40;
    matchedFields.push('country');
  }

  return { score, matchedFields };
}

/**
 * Search airports by query with ranking
 */
export function searchAirports(
  airports: Airport[],
  query: string,
  limit: number = 10
): AirportSearchResult[] {
  if (!query || query.trim().length === 0) {
    // Return popular airports (first 10) if no query
    return airports.slice(0, limit).map(airport => ({
      ...airport,
      matchScore: 0,
      matchedFields: [],
    }));
  }

  const results: AirportSearchResult[] = [];

  for (const airport of airports) {
    const { score, matchedFields } = calculateMatchScore(airport, query);

    if (score > 0) {
      results.push({
        ...airport,
        matchScore: score,
        matchedFields,
      });
    }
  }

  // Sort by score (highest first)
  results.sort((a, b) => b.matchScore - a.matchScore);

  // Return limited results
  return results.slice(0, limit);
}

/**
 * Get popular airports (predefined list of major airports)
 */
export function getPopularAirports(airports: Airport[]): Airport[] {
  const popularCodes = [
    'LHR', 'JFK', 'DXB', 'LAX', 'ORD', 'CDG', 'FRA', 'AMS', 
    'IST', 'SIN', 'HKG', 'ICN', 'DEL', 'BOM', 'SYD', 'BKK',
    'NRT', 'MAD', 'BCN', 'FCO'
  ];

  const popular: Airport[] = [];
  
  for (const code of popularCodes) {
    const airport = airports.find(a => a.code === code);
    if (airport) {
      popular.push(airport);
    }
  }

  return popular;
}
