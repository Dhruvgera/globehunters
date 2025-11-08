/**
 * Test the price check transformation with actual API response
 */

import fs from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

console.log('🧪 TESTING PRICE CHECK TRANSFORMATION');
console.log('═══════════════════════════════════════════════════════════════\n');

// Read the saved API response
const responsePath = join(__dirname, 'output', 'price-check-response.json');
const responseData = JSON.parse(fs.readFileSync(responsePath, 'utf-8'));

// Import the transformation function (we'll simulate it here since we can't import TS directly)
function extractUpgradeOptions(priceData, currency) {
  if (!priceData || priceData.length === 0) {
    return [];
  }

  const basePrice = parseFloat(priceData[0].Total_Fare?.total || '0');
  
  return priceData.map((option, index) => {
    const totalFare = option.Total_Fare || {};
    const totalPrice = parseFloat(totalFare.total || '0');
    const baseFareAmount = parseFloat(totalFare.base || '0');
    const taxes = parseFloat(totalFare.tax || '0');
    
    // Get brand name from Total_Fare.Name or BrandInfo
    const brandName = totalFare.Name || 
      (option.BrandInfo?.[0]?.BrandName) || 
      '';

    // Calculate price per person
    const pricingArr = option.pricingArr || [];
    const paxCount = pricingArr.reduce(
      (sum, pax) => sum + parseInt(pax.passengers || '0', 10),
      0
    ) || 1;
    const pricePerPerson = paxCount > 0 ? totalPrice / paxCount : totalPrice;

    // Get cabin class - from pricingArr or BrandInfo
    const cabinClassCode = pricingArr[0]?.CabinClass || 
      option.BrandInfo?.[0]?.cabinCode ||
      'Y';
    
    // Map cabin class code
    const cabinClassDisplay = option.BrandInfo?.[0]?.CabinName || 
      mapCabinClassCode(cabinClassCode);
    
    // Get booking code from pricingArr
    const bookingCode = pricingArr[0]?.BookingCode || '';
    
    // Determine if this is an upgrade
    const isUpgrade = index > 0 && totalPrice > basePrice;
    const priceDifference = isUpgrade ? totalPrice - basePrice : undefined;

    // Parse passenger breakdown
    const passengerBreakdown = pricingArr.map((pax) => ({
      type: pax.paxtype || 'ADT',
      count: parseInt(pax.passengers || '1', 10),
      basePrice: parseFloat(pax.base || '0'),
      totalPrice: parseFloat(pax.total || '0'),
      taxesPerPerson: parseFloat(pax.tax || '0'),
    }));

    // Parse baggage from baggageTxt
    const baggageTxt = option.baggageTxt || {};
    const routeKeys = Object.keys(baggageTxt);
    const firstRoute = routeKeys[0];
    const baggageInfo = firstRoute ? baggageTxt[firstRoute]?.ADT : '';
    
    const baggage = {
      description: baggageInfo ? parseBaggageDescription(baggageInfo) : '1 Cabin bag',
      details: baggageInfo || undefined,
    };

    return {
      id: `fare_${index + 1}`,
      cabinClass: cabinClassCode.toString(),
      cabinClassDisplay,
      bookingCode: brandName || bookingCode,
      totalPrice,
      pricePerPerson,
      currency,
      baseFare: baseFareAmount,
      taxes,
      baggage,
      brandInfo: option.BrandInfo || [],
      isUpgrade,
      priceDifference,
    };
  });
}

function mapCabinClassCode(code) {
  const codeStr = String(code);
  
  // Numeric codes
  if (codeStr === '2') return 'Business';
  if (codeStr === '3') return 'Premium Economy';
  if (codeStr === '4') return 'Economy';
  
  // Letter codes
  return mapCabinClass(codeStr);
}

function mapCabinClass(code) {
  const upperCode = code.toUpperCase();
  const mapping = {
    'F': 'First Class',
    'C': 'Business',
    'J': 'Business',
    'W': 'Premium Economy',
    'Y': 'Economy',
    'M': 'Economy',
    'S': 'Economy',
    'H': 'Economy',
  };
  return mapping[upperCode] || 'Economy';
}

function parseBaggageDescription(baggageCode) {
  if (!baggageCode || baggageCode.trim() === '') return '1 Cabin bag';
  
  const code = baggageCode.trim();
  
  // Check for piece indicators
  if (code.includes('1p')) return '1 Checked bag';
  if (code.includes('2p')) return '2 Checked bags';
  if (code.includes('3p')) return '3 Checked bags';
  
  // If ends with just *** or similar, no checked bags
  if (code.endsWith('***') || code === 'SK***') return '1 Cabin bag only';
  
  // Extract number if present
  const numberMatch = code.match(/(\d+)p/i);
  if (numberMatch) {
    const num = parseInt(numberMatch[1]);
    if (num === 0) return '1 Cabin bag only';
    if (num === 1) return '1 Checked bag';
    return `${num} Checked bags`;
  }
  
  // Default
  return '1 Cabin bag';
}

// Run the transformation
try {
  const priceData = responseData.data.priceCheck.price_data;
  const currency = responseData.data.priceCheck.flight_data.result.FlightPswResult.iso_currency_code;
  
  console.log('📦 Transforming', priceData.length, 'fare options...\n');
  
  const options = extractUpgradeOptions(priceData, currency);
  
  console.log('✅ TRANSFORMED FARE OPTIONS:', options.length, '\n');
  console.log('═══════════════════════════════════════════════════════════════\n');
  
  options.forEach((option, index) => {
    console.log(`Option ${index + 1}: ${option.bookingCode}`);
    console.log(`  Cabin: ${option.cabinClassDisplay} (code: ${option.cabinClass})`);
    console.log(`  Price: ${option.totalPrice} ${option.currency} (${option.pricePerPerson} per person)`);
    console.log(`  Baggage: ${option.baggage.description}`);
    if (option.baggage.details) {
      console.log(`  Baggage Details: ${option.baggage.details}`);
    }
    if (option.isUpgrade) {
      console.log(`  Price Difference: +${option.priceDifference} ${option.currency}`);
    }
    console.log('');
  });
  
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('✅ Transformation test completed successfully!');
  
} catch (error) {
  console.error('❌ Transformation failed:', error);
  console.error(error.stack);
  process.exit(1);
}

