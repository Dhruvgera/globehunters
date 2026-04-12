/**
 * Price Check API Service
 * Handles communication with Vyspa price check endpoint
 */

import { VYSPA_CONFIG } from '@/config/vyspa';
import { cabinCodeToDisplayName } from '@/lib/utils/cabinClass';
import { decodeHtmlEntities } from '@/lib/utils/html';
// COMMENTED OUT: Currency conversion imports - using API-returned currency directly
// import { convertCurrency, getTargetCurrency } from '@/lib/currency';
import type {
  PriceCheckRequest,
  PriceCheckResponse,
  PriceCheckResult,
  PriceCheckError,
  PriceData,
  TransformedPriceOption,
  OptionalServiceItem,
} from '@/types/priceCheck';

/**
 * Call price check API
 * @param segmentResultId - Result ID from flight search (V1: numeric, V3: "79599551-0-0-172")
 * @returns Price check result with upgrade options
 */
// NOT USED: This function is not called anywhere in the codebase outside of services/
export async function checkPrice(
  segmentResultId: string | number
): Promise<PriceCheckResult> {
  return {} as PriceCheckResult;
}

/**
 * Transform API response to UI model
 */
export async function transformPriceCheckResponse(
  response: PriceCheckResponse
): Promise<PriceCheckResult> {
  try {
    const pc = response.priceCheck;
    const flightResult = pc.flight_data?.result?.FlightPswResult;
    const flightSegments = pc.flight_data?.flights || [];
    const sourceCurrency = (flightResult?.iso_currency_code || 'USD').toUpperCase();
    // COMMENTED OUT: Using API-returned currency directly
    // const targetCurrency = getTargetCurrency().toUpperCase();

    if (!flightResult) {
      throw createPriceCheckError(
        'API_ERROR',
        'Missing flight result data',
        'Invalid price check response',
        response
      );
    }

    // Extract flexibility info from OptionalService array in first price_data
    // Handle both array and object-with-numeric-keys formats
    let firstPriceData: any = null;
    if (Array.isArray(pc.price_data)) {
      firstPriceData = pc.price_data[0];
    } else if (pc.price_data && typeof pc.price_data === 'object') {
      // Get first item from object (key "0" or first available key)
      const keys = Object.keys(pc.price_data).sort((a, b) => parseInt(a) - parseInt(b));
      firstPriceData = keys.length > 0 ? (pc.price_data as any)[keys[0]] : null;
    }
    
    const optionalServices = firstPriceData?.Total_Fare?.OptionalService || [];
    
    // Check if changeable (Rebooking tag with "Included in the brand")
    const changeableService = optionalServices.find(
      (s: { Tag?: string }) => s.Tag === 'Rebooking'
    );
    const isChangeable = changeableService?.Chargeable === 'Included in the brand' ||
      changeableService?.Chargeable?.toLowerCase().includes('available');
    
    // Check if seat selection is free (Seat Assignment tag with "Included in the brand")
    const seatService = optionalServices.find(
      (s: { Tag?: string }) => s.Tag === 'Seat Assignment'
    );
    const isSeatSelectionFree = seatService?.Chargeable === 'Included in the brand';

    // Extract flight details safely
    const flightDetails = {
      id: flightResult.id || '',
      origin: flightResult.Origin || '',
      destination: flightResult.Destination || '',
      validatingCarrier: flightResult.validating_carrier || '',
      lastTicketDate: flightResult.last_ticket_date || '',
      // Refundable codes: 1=Refundable, 2=Non-Refundable, 3=RefundableWithPenalty, 4=FullyRefundable
      ...(() => {
        const refundCode = parseInt(String(flightResult.refundable), 10);
        console.log('[PriceCheck] refundable value:', {
          raw: flightResult.refundable,
          code: refundCode
        });
        
        // Map code to status and text
        let refundableStatus: 'non-refundable' | 'refundable' | 'refundable-with-penalty' | 'fully-refundable';
        let refundableText: string;
        let refundable: boolean;
        
        switch (refundCode) {
          case 1:
            refundableStatus = 'refundable';
            refundableText = 'Ticket can be refunded (fees may apply)';
            refundable = true;
            break;
          case 3:
            refundableStatus = 'refundable-with-penalty';
            refundableText = 'Refundable with penalty fees';
            refundable = true;
            break;
          case 4:
            refundableStatus = 'fully-refundable';
            refundableText = 'Fully refundable';
            refundable = true;
            break;
          case 2:
          default:
            refundableStatus = 'non-refundable';
            refundableText = 'Ticket can\'t be refunded';
            refundable = false;
            break;
        }
        
        return { refundable, refundableStatus, refundableText };
      })(),
      changeable: isChangeable,
      seatSelectionFree: isSeatSelectionFree,
      availableSeats: flightResult.avlSeats || 'Limited',
      segments: flightSegments.map((seg) => {
        try {
          return {
            segmentNumber: parseInt(seg.FlightPswFlightnew?.segment || '1', 10),
            flights: [{
              airline: seg.FlightPswFlightnew?.airline_code || '',
              flightNumber: seg.FlightPswFlightnew?.flight_number || '',
              departureAirport: seg.FlightPswFlightnew?.departure_airport || '',
              arrivalAirport: seg.FlightPswFlightnew?.arrival_airport || '',
              departureDate: seg.FlightPswFlightnew?.departure_date || '',
              departureTime: seg.FlightPswFlightnew?.departure_time || '',
              arrivalDate: seg.FlightPswFlightnew?.arrival_date || '',
              arrivalTime: seg.FlightPswFlightnew?.arrival_time || '',
              duration: seg.FlightPswFlightnew?.travel_time || '',
              cabinClass: seg.Link?.CabinClass || 'Y',
              aircraft: seg.FlightPswFlightnew?.aircraft_type || '',
              baggage: seg.Link?.Baggage || '',
              fareBasis: seg.Link?.FareBasis || '',
              terminal: {
                departure: seg.FlightPswFlightnew?.departure_terminal || undefined,
                arrival: seg.FlightPswFlightnew?.arrival_terminal || undefined,
              },
            }],
          };
        } catch (segError) {
          console.error('Error parsing segment:', segError);
          return {
            segmentNumber: 0,
            flights: [],
          };
        }
      }),
    };

    // Extract price options (upgrade options) - handle safely
    // Normalize price_data: API returns either an array OR an object with numeric keys
    let priceDataArray: PriceData[] = [];
    if (Array.isArray(pc.price_data)) {
      priceDataArray = pc.price_data;
    } else if (pc.price_data && typeof pc.price_data === 'object') {
      // Convert object with numeric keys to array
      priceDataArray = Object.values(pc.price_data) as PriceData[];
      console.log('[PriceCheck] Converted price_data object to array:', priceDataArray.length, 'options');
    }

    let priceOptions: TransformedPriceOption[] = [];
    try {
      priceOptions = extractUpgradeOptions(
        priceDataArray,
        sourceCurrency
      );
    } catch (priceError) {
      console.error('Error extracting upgrade options:', priceError);
    }

    // If API returns price_data but all totals are zero/missing, treat this as
    // "no usable upgrade options" and fall back to the main flight result
    const shouldFallbackToFlightResult =
      !priceOptions.length ||
      priceOptions.every((opt) => !opt.totalPrice || opt.totalPrice <= 0);

    if (shouldFallbackToFlightResult) {
      console.warn('Price check returned no usable price options, falling back to main flight total_fare');
      // Use the same refundable info from flightDetails for fallback
      priceOptions = [{
        id: flightResult.id || 'fallback',
        cabinClass: 'Y',
        cabinClassDisplay: 'Economy',
        cabinName: 'Economy',
        bookingCode: '',
        totalPrice: parseFloat(flightResult.total_fare || '0'),
        pricePerPerson: parseFloat(flightResult.total_fare || '0'),
        currency: sourceCurrency,
        baseFare: parseFloat(flightResult.base_fare || '0'),
        taxes: parseFloat(flightResult.tax || '0'),
        markup: parseFloat(flightResult.markupAmt || '0'),
        commission: parseFloat(flightResult.CommissionAmount || '0'),
        atolFee: 0,
        passengerBreakdown: [{
          type: 'ADT',
          count: 1,
          basePrice: parseFloat(flightResult.base_fare || '0'),
          totalPrice: parseFloat(flightResult.total_fare || '0'),
          taxesPerPerson: parseFloat(flightResult.tax || '0'),
        }],
        baggage: {
          description: 'Check airline policy',
          details: undefined,
        },
        brandInfo: [],
        isUpgrade: false,
        priceDifference: undefined,
        // Default empty OptionalService fields for fallback option
        checkedBaggageServices: [],
        carryOnBaggageServices: [],
        refundService: undefined,
        rebookingService: undefined,
        seatServices: [],
        mealsService: undefined,
        // Use flight details refundable info for fallback
        refundable: flightDetails.refundable,
        refundableStatus: flightDetails.refundableStatus,
        refundableText: flightDetails.refundableText,
      }];
    }

    // Normalize currency: convert all price amounts to target currency for display consistency
    // COMMENTED OUT: Using API-returned currency directly (FlightsUK returns GBP, FlightsUS returns USD)
    // if (priceOptions.length > 0 && sourceCurrency !== targetCurrency) {
    //   const converted = await Promise.all(
    //     priceOptions.map(async (opt) => {
    //       const totalPrice = await convertCurrency(opt.totalPrice, sourceCurrency, targetCurrency);
    //       const pricePerPerson = await convertCurrency(opt.pricePerPerson, sourceCurrency, targetCurrency);
    //       const baseFare = await convertCurrency(opt.baseFare, sourceCurrency, targetCurrency);
    //       const taxes = await convertCurrency(opt.taxes, sourceCurrency, targetCurrency);
    //       const markup = await convertCurrency(opt.markup, sourceCurrency, targetCurrency);
    //       const commission = await convertCurrency(opt.commission, sourceCurrency, targetCurrency);
    //       const atolFee = await convertCurrency(opt.atolFee, sourceCurrency, targetCurrency);
    //       const passengerBreakdown = await Promise.all(
    //         opt.passengerBreakdown.map(async (p) => ({
    //           ...p,
    //           basePrice: await convertCurrency(p.basePrice, sourceCurrency, targetCurrency),
    //           totalPrice: await convertCurrency(p.totalPrice, sourceCurrency, targetCurrency),
    //           taxesPerPerson: await convertCurrency(p.taxesPerPerson, sourceCurrency, targetCurrency),
    //         }))
    //       );
    //       return {
    //         ...opt,
    //         totalPrice,
    //         pricePerPerson,
    //         baseFare,
    //         taxes,
    //         markup,
    //         commission,
    //         atolFee,
    //         passengerBreakdown,
    //         currency: targetCurrency,
    //       };
    //     })
    //   );
    //   priceOptions = converted;
    // }

    // Ensure options are sorted by total price and upgrade flags are accurate
    if (priceOptions.length > 1) {
      priceOptions = [...priceOptions].sort((a, b) => a.totalPrice - b.totalPrice);
      const baseTotal = priceOptions[0].totalPrice;
      priceOptions = priceOptions.map((opt, idx) => ({
        ...opt,
        isUpgrade: idx > 0 && opt.totalPrice > baseTotal,
        priceDifference: idx > 0 ? opt.totalPrice - baseTotal : undefined,
      }));
    }

    // Session info for booking
    const sessionInfo = {
      sessionId: pc.sessionId || '',
      pscRequestId: pc.psc_request_id || '',
      pswResultId: pc.psw_result_id || '',
    };

    return {
      success: true,
      flightDetails,
      priceOptions,
      sessionInfo,
    };
  } catch (transformError: any) {
    console.error('Transformation error:', transformError);
    throw createPriceCheckError(
      'API_ERROR',
      transformError.message || 'Failed to transform response',
      'Unable to process pricing data. Please try again.',
      {
        error: transformError.toString(),
        response: response,
      }
    );
  }
}

/**
 * Generate a unique key for deduplication based on meaningful option parameters
 * Options are considered duplicates if they have the same:
 * - cabin class display name
 * - total price
 * - baggage description
 */
function generateOptionKey(option: TransformedPriceOption): string {
  return `${option.cabinClassDisplay}|${option.totalPrice}|${option.baggage.description}`;
}

/**
 * Extract upgrade options from price data
 */
function extractUpgradeOptions(
  priceData: PriceData[],
  currency: string
): TransformedPriceOption[] {
  // Guard against non-array payloads from API
  if (!Array.isArray(priceData) || priceData.length === 0) {
    return [];
  }

  // Determine true base price as the cheapest total in the set
  const totals = priceData.map((pd) => parseFloat(pd.Total_Fare?.total || '0')).filter((n) => !Number.isNaN(n) && n >= 0);
  const basePrice = totals.length ? Math.min(...totals) : parseFloat(priceData[0].Total_Fare?.total || '0');

  const options = priceData.map((option, index) => transformPriceOption(option, index, basePrice, currency));

  // Sort by total price ascending
  const sorted = [...options].sort((a, b) => a.totalPrice - b.totalPrice);
  
  // Deduplicate options with same parameters (cabin class, price, baggage)
  // Keep the first occurrence (cheapest with those parameters due to sorting)
  const seen = new Set<string>();
  const deduplicated = sorted.filter((opt) => {
    const key = generateOptionKey(opt);
    if (seen.has(key)) {
      console.log('[PriceCheck] Removing duplicate upgrade option:', {
        cabinClass: opt.cabinClassDisplay,
        price: opt.totalPrice,
        baggage: opt.baggage.description,
      });
      return false;
    }
    seen.add(key);
    return true;
  });
  
  const cheapest = deduplicated[0]?.totalPrice ?? basePrice;

  // Recompute upgrade flags/differences based on cheapest option
  return deduplicated.map((opt, idx) => ({
    ...opt,
    isUpgrade: idx > 0 && opt.totalPrice > cheapest,
    priceDifference: idx > 0 ? opt.totalPrice - cheapest : undefined,
  }));
}

/**
 * Parse Chargeable field from API to normalized value
 * API values: "Included in the brand", "Available for a charge", "Not offered"
 */
function parseChargeableStatus(chargeable?: string): 'included' | 'chargeable' | 'not_offered' {
  if (!chargeable) return 'not_offered';
  const lower = chargeable.toLowerCase();
  if (lower.includes('included')) return 'included';
  if (lower.includes('charge') || lower.includes('available')) return 'chargeable';
  return 'not_offered';
}

/**
 * Extract OptionalService items by tag from the OptionalService array
 * Filters out items where Chargeable is "Not offered" (as per email instructions)
 * 
 * @param optionalServices - Array of OptionalService from Total_Fare
 * @param tag - The tag to filter by (e.g., "Checked Baggage", "Refund")
 * @param includeNotOffered - If true, also returns "Not offered" items (default: false)
 */
function extractServicesByTag(
  optionalServices: any[],
  tag: string,
  includeNotOffered: boolean = false
): OptionalServiceItem[] {
  if (!Array.isArray(optionalServices)) return [];
  
  return optionalServices
    .filter((svc: any) => {
      if (svc.Tag !== tag) return false;
      // Filter out "Not offered" items unless explicitly requested
      if (!includeNotOffered && svc.Chargeable?.toLowerCase().includes('not offered')) {
        return false;
      }
      return true;
    })
    .map((svc: any) => ({
      tag: decodeHtmlEntities(svc.Tag || ''),
      text: decodeHtmlEntities(svc.text || ''),
      chargeable: parseChargeableStatus(svc.Chargeable),
      type: svc.Type || undefined,
    }));
}

/**
 * Extract a single OptionalService item by tag (returns first match)
 */
function extractSingleServiceByTag(
  optionalServices: any[],
  tag: string,
  includeNotOffered: boolean = false
): OptionalServiceItem | undefined {
  const items = extractServicesByTag(optionalServices, tag, includeNotOffered);
  return items.length > 0 ? items[0] : undefined;
}

/**
 * Transform a single price option
 */
function transformPriceOption(
  option: any,
  index: number,
  basePrice: number,
  currency: string
): TransformedPriceOption {
  const totalFare = option.Total_Fare || {} as any;
  const totalPrice = parseFloat(totalFare.total || '0');
  const baseFareAmount = parseFloat(totalFare.base || '0');
  const taxes = parseFloat(totalFare.tax || '0');
  
  // Get brand name from Total_Fare.Name or BrandInfo
  const brandName = (totalFare.Name || '').toString().trim() || 
    (option.BrandInfo?.[0]?.BrandName?.toString().trim()) || 
    '';

  // Extract refundable status from this specific fare option's Total_Fare
  // Refundable codes: 1=Refundable, 2=Non-Refundable, 3=RefundableWithPenalty, 4=FullyRefundable
  const optionRefundCode = parseInt(String(totalFare.refundable ?? '2'), 10);
  let optionRefundableStatus: 'non-refundable' | 'refundable' | 'refundable-with-penalty' | 'fully-refundable';
  let optionRefundableText: string;
  let optionRefundable: boolean;
  
  switch (optionRefundCode) {
    case 1:
      optionRefundableStatus = 'refundable';
      optionRefundableText = totalFare.refundable_text || 'Ticket can be refunded (fees may apply)';
      optionRefundable = true;
      break;
    case 3:
      optionRefundableStatus = 'refundable-with-penalty';
      optionRefundableText = totalFare.refundable_text || 'Refundable with penalty fees';
      optionRefundable = true;
      break;
    case 4:
      optionRefundableStatus = 'fully-refundable';
      optionRefundableText = totalFare.refundable_text || 'Fully refundable';
      optionRefundable = true;
      break;
    case 2:
    default:
      optionRefundableStatus = 'non-refundable';
      optionRefundableText = totalFare.refundable_text || "Ticket can't be refunded";
      optionRefundable = false;
      break;
  }

  // Calculate price per person
  const pricingArr = option.pricingArr || [];
  const paxCount = pricingArr.reduce(
    (sum: number, pax: any) => sum + parseInt(pax.passengers || '0', 10),
    0
  ) || 1;
  const pricePerPerson = paxCount > 0 ? totalPrice / paxCount : totalPrice;

  // Get cabin class - from pricingArr or BrandInfo
  const cabinClassCode = pricingArr[0]?.CabinClass || 
    option.BrandInfo?.[0]?.cabinCode ||
    'Y';
  
  // Use brand name (e.g., "ECONOMY LIGHT") for display, fallback to cabin name
  const cabinClassDisplay = brandName || 
    option.BrandInfo?.[0]?.CabinName || 
    cabinCodeToDisplayName(cabinClassCode);
  
  // Get booking code - prefer explicit fields, do NOT override with brand name
  const bookingCode =
    pricingArr[0]?.BookingCode ||
    option.BookingCode ||
    totalFare.BookingCode ||
    '';
  
  // Determine if this is an upgrade
  const isUpgrade = index > 0 && totalPrice > basePrice;
  const priceDifference = isUpgrade ? totalPrice - basePrice : undefined;

  // Parse passenger breakdown
  const passengerBreakdown = pricingArr.map((pax: any) => ({
    type: pax.paxtype || 'ADT',
    count: parseInt(pax.passengers || '1', 10),
    basePrice: parseFloat(pax.base || '0'),
    totalPrice: parseFloat(pax.total || '0'),
    taxesPerPerson: parseFloat(pax.tax || '0'),
  }));

  // Parse baggage from baggageTxt
  // Support both array-of-strings and route-keyed objects
  // For mixed-cabin fares, show baggage per leg
  let baggageInfo = '';
  let perLegBaggage: { route: string; allowance: string }[] = [];
  const baggageTxt = option.baggageTxt;
  
  if (Array.isArray(baggageTxt)) {
    baggageInfo = baggageTxt[0] || '';
  } else if (baggageTxt && typeof baggageTxt === 'object') {
    const routeKeys = Object.keys(baggageTxt);
    // Build per-leg baggage info with unique allowances per route
    perLegBaggage = routeKeys.map(route => {
      const rawValue = (baggageTxt as any)[route]?.ADT || '';
      return {
        route,
        allowance: parseBaggageDescription(rawValue),
      };
    });
    // For the main description, show the highest baggage allowance
    const weights = routeKeys.map(route => {
      const raw = (baggageTxt as any)[route]?.ADT || '';
      const match = raw.match(/(\d+)\s*[Kk]/);
      return match ? parseInt(match[1]) : 0;
    });
    const maxWeight = Math.max(...weights);
    const maxIndex = weights.indexOf(maxWeight);
    baggageInfo = maxIndex >= 0 ? (baggageTxt as any)[routeKeys[maxIndex]]?.ADT : '';
  }
  
  const baggage = {
    description: baggageInfo ? parseBaggageDescription(baggageInfo) : '1 Cabin bag',
    details: (baggageInfo && !/^[A-Z]{2}\*{3}/i.test(baggageInfo)) ? baggageInfo : undefined,
    perLeg: perLegBaggage.length > 0 ? perLegBaggage : undefined,
  };

  // Extract CabinName from BrandInfo (e.g., "Economy", "Premium Economy", "Business")
  const cabinName = option.BrandInfo?.[0]?.CabinName || cabinCodeToDisplayName(cabinClassCode);

  // --- Extract OptionalService items by tag ---
  // These provide detailed baggage, flexibility, and meal information
  const optionalServices = totalFare.OptionalService || [];
  
  // Baggage: "Checked Baggage" and "Carry On Hand Baggage" tags
  // Note: We don't include "Not offered" items (per email instructions)
  const checkedBaggageServices = extractServicesByTag(optionalServices, 'Checked Baggage');
  const carryOnBaggageServices = extractServicesByTag(optionalServices, 'Carry On Hand Baggage');
  
  // Flexibility: "Refund", "Rebooking", and "Seat Assignment" tags
  const refundService = extractSingleServiceByTag(optionalServices, 'Refund');
  const rebookingService = extractSingleServiceByTag(optionalServices, 'Rebooking');
  const seatServices = extractServicesByTag(optionalServices, 'Seat Assignment');
  
  // Meals: "Meals and Beverages" tag
  const mealsService = extractSingleServiceByTag(optionalServices, 'Meals and Beverages');

  return {
    id: `fare_${index + 1}`,
    cabinClass: cabinClassCode.toString(),
    cabinClassDisplay,
    cabinName,
    bookingCode,
    totalPrice,
    pricePerPerson,
    currency,
    baseFare: baseFareAmount,
    taxes,
    markup: parseFloat(totalFare.markup || '0'),
    commission: parseFloat(totalFare.comm || '0'),
    atolFee: parseFloat(totalFare.Atol_fee || '0'),
    passengerBreakdown: passengerBreakdown.length > 0 ? passengerBreakdown : [{
      type: 'ADT',
      count: 1,
      basePrice: baseFareAmount,
      totalPrice: totalPrice,
      taxesPerPerson: taxes,
    }],
    baggage,
    brandInfo: option.BrandInfo || [],
    isUpgrade,
    priceDifference,
    // New OptionalService extracted fields
    checkedBaggageServices,
    carryOnBaggageServices,
    refundService,
    rebookingService,
    seatServices,
    mealsService,
    // Refundable status for this specific fare option
    refundable: optionRefundable,
    refundableStatus: optionRefundableStatus,
    refundableText: optionRefundableText,
  };
}

/**
 * Parse baggage description from baggage code
 * Format examples: 
 * - "SK***" - cabin bag only
 * - "SK***1p", "SK***2p" - piece-based
 * - "GF***25K", "GF***30K" - weight-based (kg)
 */
function parseBaggageDescription(baggageCode: string): string {
  if (!baggageCode || baggageCode.trim() === '') return '1 Cabin bag';
  
  const code = baggageCode.trim();
  
  // Check for weight-based indicators (e.g., "GF***25K", "GF***30K", "25kg")
  const weightMatch = code.match(/(\d+)\s*[Kk][Gg]?/);
  if (weightMatch) {
    const weight = parseInt(weightMatch[1]);
    if (weight > 0) return `${weight}kg checked baggage`;
  }
  
  // Check for piece indicators
  if (code.includes('1p')) return '1 checked bag';
  if (code.includes('2p')) return '2 checked bags';
  if (code.includes('3p')) return '3 checked bags';
  
  // If ends with just *** or similar, no checked bags
  if (code.endsWith('***') || code === 'SK***') return 'Cabin bag only';
  
  // Extract number if present (piece-based)
  const numberMatch = code.match(/(\d+)p/i);
  if (numberMatch) {
    const num = parseInt(numberMatch[1]);
    if (num === 0) return 'Cabin bag only';
    if (num === 1) return '1 checked bag';
    return `${num} checked bags`;
  }
  
  // Default
  return 'Cabin bag only';
}

/**
 * Create price check error
 */
export function createPriceCheckError(
  type: PriceCheckError['type'],
  message: string,
  userMessage: string,
  details?: any
): PriceCheckError {
  return {
    type,
    message,
    userMessage,
    details,
  };
}


