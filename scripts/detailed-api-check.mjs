/**
 * Detailed analysis of price_data from API response
 */

import fs from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

console.log('🔍 DETAILED PRICE DATA ANALYSIS');
console.log('═══════════════════════════════════════════════════════════════\n');

// Read the saved API response
const responsePath = join(__dirname, 'output', 'price-check-response.json');
const responseData = JSON.parse(fs.readFileSync(responsePath, 'utf-8'));

const priceData = responseData.data.priceCheck.price_data;

console.log(`Found ${priceData.length} price options\n`);
console.log('═══════════════════════════════════════════════════════════════\n');

priceData.forEach((option, index) => {
  console.log(`\n📋 OPTION ${index + 1}:`);
  console.log('─────────────────────────────────────────────────────────────');
  
  // Total Fare
  const totalFare = option.Total_Fare || {};
  console.log('\n💰 Total_Fare object:');
  console.log('  Name:', totalFare.Name || 'MISSING');
  console.log('  base:', totalFare.base);
  console.log('  total:', totalFare.total);
  console.log('  tax:', totalFare.tax);
  console.log('  BrandId:', totalFare.BrandId);
  
  // Pricing Array
  const pricingArr = option.pricingArr || [];
  console.log('\n👥 pricingArr[0]:');
  if (pricingArr[0]) {
    console.log('  CabinClass:', pricingArr[0].CabinClass);
    console.log('  BookingCode:', pricingArr[0].BookingCode);
    console.log('  paxtype:', pricingArr[0].paxtype);
    console.log('  passengers:', pricingArr[0].passengers);
    console.log('  total:', pricingArr[0].total);
  } else {
    console.log('  EMPTY/MISSING');
  }
  
  // Baggage
  const baggageTxt = option.baggageTxt || {};
  console.log('\n🧳 baggageTxt:');
  const routes = Object.keys(baggageTxt);
  if (routes.length > 0) {
    routes.forEach(route => {
      console.log(`  ${route}:`, baggageTxt[route]);
    });
  } else {
    console.log('  EMPTY/MISSING');
  }
  
  // Brand Info
  console.log('\n🏷️  BrandInfo:');
  const brandInfo = option.BrandInfo || [];
  if (brandInfo.length > 0) {
    console.log('  First BrandInfo:');
    console.log('    BrandName:', brandInfo[0].BrandName);
    console.log('    CabinName:', brandInfo[0].CabinName);
    console.log('    cabinCode:', brandInfo[0].cabinCode);
    console.log('    BookingCode:', brandInfo[0].BookingCode);
    console.log('    seatsAvailable:', brandInfo[0].seatsAvailable);
  } else {
    console.log('  EMPTY/MISSING');
  }
  
  console.log('\n═══════════════════════════════════════════════════════════════');
});

console.log('\n\n🎯 SUMMARY OF WHAT WE EXTRACT:');
console.log('═══════════════════════════════════════════════════════════════\n');

priceData.forEach((option, index) => {
  const totalFare = option.Total_Fare || {};
  const pricingArr = option.pricingArr || [];
  const baggageTxt = option.baggageTxt || {};
  const brandInfo = option.BrandInfo || [];
  
  // What we actually use
  const brandName = totalFare.Name || (brandInfo[0]?.BrandName) || 'MISSING';
  const cabinClassCode = pricingArr[0]?.CabinClass || brandInfo[0]?.cabinCode || 'MISSING';
  const cabinClassDisplay = brandInfo[0]?.CabinName || 'MISSING';
  const bookingCode = pricingArr[0]?.BookingCode || 'MISSING';
  
  const routeKeys = Object.keys(baggageTxt);
  const firstRoute = routeKeys[0];
  const baggageInfo = firstRoute ? baggageTxt[firstRoute]?.ADT : 'MISSING';
  
  console.log(`Option ${index + 1}:`);
  console.log(`  Brand Name (Total_Fare.Name): "${brandName}"`);
  console.log(`  Cabin Code (pricingArr[0].CabinClass): "${cabinClassCode}"`);
  console.log(`  Cabin Display (BrandInfo[0].CabinName): "${cabinClassDisplay}"`);
  console.log(`  Booking Code (pricingArr[0].BookingCode): "${bookingCode}"`);
  console.log(`  Baggage (baggageTxt): "${baggageInfo}"`);
  console.log('');
});

console.log('═══════════════════════════════════════════════════════════════');



