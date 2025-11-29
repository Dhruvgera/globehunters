/**
 * Price Check API Service
 * Handles communication with Vyspa price check endpoint
 */

import { VYSPA_CONFIG } from '@/config/vyspa';
// COMMENTED OUT: Currency conversion imports - using API-returned currency directly
// import { convertCurrency, getTargetCurrency } from '@/lib/currency';
import type {
  PriceCheckRequest,
  PriceCheckResponse,
  PriceCheckResult,
  PriceCheckError,
  PriceData,
  TransformedPriceOption,
} from '@/types/priceCheck';

/**
 * Call price check API
 * @param segmentResultId - Result ID from flight search
 * @returns Price check result with upgrade options
 */
export async function checkPrice(
  segmentResultId: string | number
): Promise<PriceCheckResult> {
  // Convert to string and validate input
  const segmentIdStr = String(segmentResultId).trim();
  
  if (!segmentResultId || segmentIdStr === '' || segmentIdStr === 'undefined' || segmentIdStr === 'null') {
    throw createPriceCheckError(
      'VALIDATION_ERROR',
      'Invalid segment result ID',
      'Unable to check price. Please try searching again.',
      { segmentResultId, type: typeof segmentResultId }
    );
  }

  // Prepare request
  const request: PriceCheckRequest[] = [{
    segment_psw_result1: parseInt(segmentIdStr, 10)
  }];

  console.log('🔍 Price Check Request:', {
    segmentResultId,
    timestamp: new Date().toISOString(),
  });

  try {
    // Create abort controller for timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => {
      controller.abort();
    }, VYSPA_CONFIG.defaults.timeout);

    // Build API URL and auth header
    const basicAuth = Buffer.from(
      `${VYSPA_CONFIG.credentials.username}:${VYSPA_CONFIG.credentials.password}`
    ).toString('base64');
    const apiUrl = VYSPA_CONFIG.apiUrl.replace(/\/+$/, '');
    const endpoint = `${apiUrl}/rest/v4/price_check/`;

    // Make API call
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Basic ${basicAuth}`,
        'Api-Version': VYSPA_CONFIG.apiVersion,
      },
      body: JSON.stringify(request),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    console.log('📥 Price Check Response Status:', response.status);

    // Handle HTTP errors
    if (!response.ok) {
      throw createPriceCheckError(
        'API_ERROR',
        `HTTP ${response.status}: ${response.statusText}`,
        'Unable to check price. Please try again.',
        { status: response.status }
      );
    }

    // Parse response
    const data: PriceCheckResponse = await response.json();

    console.log('✅ Price Check Success:', {
      success: data.success,
      hasData: !!data.priceCheck,
      timestamp: new Date().toISOString(),
    });

    // Check for API-level errors
    if (!data.success || !data.priceCheck) {
      throw createPriceCheckError(
        'API_ERROR',
        data.message || 'Price check failed',
        'This fare is no longer available. Please search again.',
        data
      );
    }

    // Check if price check has required data
    if (!data.priceCheck.flight_data || !data.priceCheck.flight_data.result) {
      throw createPriceCheckError(
        'API_ERROR',
        'Incomplete price check data',
        'Unable to load fare details. Please try again.',
        data
      );
    }

    // Transform response to UI model
    return await transformPriceCheckResponse(data);

  } catch (error: any) {
    console.error('❌ Price Check API error:', error);
    
    // Handle timeout
    if (error.name === 'AbortError') {
      throw createPriceCheckError(
        'TIMEOUT_ERROR',
        'Request timed out after 30 seconds',
        'The price check is taking longer than expected. Please try again.',
        { timeout: VYSPA_CONFIG.defaults.timeout, segmentId: segmentResultId }
      );
    }

    // Handle network errors
    if (error.message?.includes('fetch') || error.message?.includes('NetworkError')) {
      throw createPriceCheckError(
        'NETWORK_ERROR',
        `Network error: ${error.message}`,
        'Unable to connect to the booking system. Please check your internet connection.',
        { error: error.toString(), segmentId: segmentResultId }
      );
    }

    // Re-throw if already a PriceCheckError
    if (error.type) {
      throw error;
    }

    // Unknown error - capture as much detail as possible
    console.error('❌ Price Check failed with error:', {
      message: error.message,
      name: error.name,
      stack: error.stack,
      error: error,
    });
    
    throw createPriceCheckError(
      'UNKNOWN_ERROR',
      error.message || error.toString() || 'Unknown error occurred',
      'Unable to verify pricing. The fare may have expired. Please search again.',
      {
        errorName: error.name,
        errorMessage: error.message,
        errorString: error.toString(),
        segmentId: segmentResultId,
        timestamp: new Date().toISOString(),
      }
    );
  }
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
    const isChangeable = changeableService?.Chargeable === 'Included in the brand';
    
    // Check if seat selection is free (Basic Seat tag with "Included in the brand")
    const seatService = optionalServices.find(
      (s: { Tag?: string }) => s.Tag === 'Basic Seat'
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
      priceOptions = [{
        id: flightResult.id || 'fallback',
        cabinClass: 'Y',
        cabinClassDisplay: 'Economy',
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
 * Extract upgrade options from price data
 */
export function extractUpgradeOptions(
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
  const cheapest = sorted[0]?.totalPrice ?? basePrice;

  // Recompute upgrade flags/differences based on cheapest option
  return sorted.map((opt, idx) => ({
    ...opt,
    isUpgrade: idx > 0 && opt.totalPrice > cheapest,
    priceDifference: idx > 0 ? opt.totalPrice - cheapest : undefined,
  }));
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
    mapCabinClassCode(cabinClassCode);
  
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
  let baggageInfo = '';
  const baggageTxt = option.baggageTxt;
  if (Array.isArray(baggageTxt)) {
    baggageInfo = baggageTxt[0] || '';
  } else if (baggageTxt && typeof baggageTxt === 'object') {
    const routeKeys = Object.keys(baggageTxt);
    const firstRoute = routeKeys[0];
    baggageInfo = firstRoute ? (baggageTxt as any)[firstRoute]?.ADT : '';
  }
  
  const baggage = {
    description: baggageInfo ? parseBaggageDescription(baggageInfo) : '1 Cabin bag',
    details: (baggageInfo && !/^[A-Z]{2}\*{3}/i.test(baggageInfo)) ? baggageInfo : undefined,
  };

  return {
    id: `fare_${index + 1}`,
    cabinClass: cabinClassCode.toString(),
    cabinClassDisplay,
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
  };
}

/**
 * Map cabin class code (numeric or letter) to display name
 */
function mapCabinClassCode(code: string | number): string {
  const codeStr = String(code);
  
  // Numeric codes
  if (codeStr === '2') return 'Business';
  if (codeStr === '3') return 'Premium Economy';
  if (codeStr === '4') return 'Economy';
  
  // Letter codes
  return mapCabinClass(codeStr);
}

/**
 * Map cabin class code to display name
 */
export function mapCabinClass(code: string): string {
  const upperCode = code.toUpperCase();
  const mapping: Record<string, string> = {
    'F': 'First Class',
    'C': 'Business',
    'J': 'Business', // Alternative business code
    'W': 'Premium Economy',
    'Y': 'Economy',
    'M': 'Economy',
    'S': 'Economy',
    'H': 'Economy',
  };
  return mapping[upperCode] || 'Economy';
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

/**
 * Check if segment result is valid
 */
export function isValidSegmentId(segmentId: string): boolean {
  return /^\d+$/.test(segmentId) && parseInt(segmentId, 10) > 0;
}

