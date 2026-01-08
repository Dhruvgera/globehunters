/**
 * Test script to verify price check via local API route
 * Tests the flow through our Next.js API route
 */

const LOCAL_API_URL = 'http://localhost:3000';

async function main() {
  console.log('🧪 Testing Price Check via Local API\n');
  console.log('='.repeat(60));

  // Step 1: Search for flights via local API
  console.log('\n📍 Step 1: Searching for flights LHR -> DXB via local API...');
  
  // The batch API expects an array of items with key, type, and params
  const searchBody = {
    items: [{
      key: 'test-search',
      type: 'departure',
      params: {
        from: 'LHR',
        to: 'DXB',
        departureDate: '2026-01-21',
        returnDate: '2026-01-28',
        passengers: {
          adults: 2,
          children: 1,
          infants: 0,
        },
        class: 'Economy',
        tripType: 'round-trip',
      },
    }],
  };

  console.log('   Search params:', JSON.stringify(searchBody, null, 2));

  try {
    const searchResponse = await fetch(`${LOCAL_API_URL}/api/search-flights-batch`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(searchBody),
    });

    if (!searchResponse.ok) {
      const text = await searchResponse.text();
      console.error('❌ Search failed:', searchResponse.status, text.substring(0, 500));
      return;
    }

    const searchResults = await searchResponse.json();
    
    // Batch API returns array of results
    if (!Array.isArray(searchResults) || searchResults.length === 0) {
      console.error('❌ No search results returned');
      return;
    }

    const searchData = searchResults[0];
    
    if (!searchData.success) {
      console.error('❌ Search failed:', searchData.error);
      return;
    }

    if (!searchData.response?.flights || searchData.response.flights.length === 0) {
      console.error('❌ No flights found');
      return;
    }

    const flights = searchData.response.flights;
    console.log(`✅ Found ${flights.length} flights`);
    console.log(`   Request ID: ${searchData.response.requestId || 'N/A'}`);
    console.log(`   Min Price: ${searchData.minPrice}`);

    // Get first flight with a flightKey
    const firstFlight = flights.find(f => f.flightKey);
    
    if (!firstFlight) {
      console.error('❌ No flights with flightKey found');
      // Show first flight details anyway
      const first = flights[0];
      console.log('\n   First flight (no flightKey):');
      console.log(`     ID: ${first.id}`);
      console.log(`     Price: ${first.price} ${first.currency}`);
      console.log(`     segmentResultId: ${first.segmentResultId}`);
      console.log(`     flightKey: ${first.flightKey || 'N/A'}`);
      return;
    }

    console.log('\n📍 First flight with flightKey:');
    console.log(`   ID: ${firstFlight.id}`);
    console.log(`   Price: ${firstFlight.price} ${firstFlight.currency}`);
    console.log(`   Route: ${firstFlight.outbound?.departureAirport?.code} -> ${firstFlight.outbound?.arrivalAirport?.code}`);
    console.log(`   segmentResultId: ${firstFlight.segmentResultId}`);
    console.log(`   flightKey: ${firstFlight.flightKey?.substring(0, 40)}...`);

    // Step 2: Call price check via local API
    console.log('\n📍 Step 2: Calling price check via local API...');
    
    const priceCheckBody = {
      segmentResultId: firstFlight.segmentResultId,
      flightKey: firstFlight.flightKey,
    };

    console.log('   Request body:', JSON.stringify({
      segmentResultId: priceCheckBody.segmentResultId,
      flightKey: priceCheckBody.flightKey?.substring(0, 40) + '...',
    }, null, 2));

    const priceCheckResponse = await fetch(`${LOCAL_API_URL}/api/price-check`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(priceCheckBody),
    });

    console.log(`   Response status: ${priceCheckResponse.status}`);

    const priceCheckData = await priceCheckResponse.json();

    if (!priceCheckResponse.ok) {
      console.error('❌ Price check failed');
      console.error('   Error:', JSON.stringify(priceCheckData, null, 2));
      return;
    }

    console.log('✅ Price check successful!');
    
    if (priceCheckData.flightDetails) {
      const fd = priceCheckData.flightDetails;
      console.log('\n   Flight Details:');
      console.log(`     ID: ${fd.id}`);
      console.log(`     Route: ${fd.origin} -> ${fd.destination}`);
      console.log(`     Refundable: ${fd.refundable} (${fd.refundableStatus})`);
      console.log(`     Available Seats: ${fd.availableSeats}`);
    }

    if (priceCheckData.priceOptions && priceCheckData.priceOptions.length > 0) {
      console.log(`\n   Price Options: ${priceCheckData.priceOptions.length}`);
      
      for (const opt of priceCheckData.priceOptions.slice(0, 3)) {
        console.log(`\n   ${opt.cabinClassDisplay} (${opt.id}):`);
        console.log(`     Total: ${opt.totalPrice} ${opt.currency}`);
        console.log(`     Per Person: ${opt.pricePerPerson} ${opt.currency}`);
        console.log(`     Base Fare: ${opt.baseFare}, Taxes: ${opt.taxes}`);
        console.log(`     Baggage: ${opt.baggage?.description}`);
        console.log(`     Refundable: ${opt.refundable} (${opt.refundableStatus})`);
        
        // Show OptionalService items
        if (opt.mealsService) {
          console.log(`     Meals: ${opt.mealsService.text} (${opt.mealsService.chargeable})`);
        }
        if (opt.seatServices && opt.seatServices.length > 0) {
          console.log(`     Seat: ${opt.seatServices[0].text} (${opt.seatServices[0].chargeable})`);
        }
        if (opt.rebookingService) {
          console.log(`     Rebooking: ${opt.rebookingService.text} (${opt.rebookingService.chargeable})`);
        }
        
        // Show passenger breakdown
        if (opt.passengerBreakdown && opt.passengerBreakdown.length > 0) {
          console.log('     Passenger Breakdown:');
          for (const pax of opt.passengerBreakdown) {
            console.log(`       ${pax.type}: ${pax.count} pax, Base: ${pax.basePrice}, Tax: ${pax.taxesPerPerson}, Total: ${pax.totalPrice}`);
          }
        }
      }
    }

    if (priceCheckData.sessionInfo) {
      console.log('\n   Session Info:');
      console.log(`     Session ID: ${priceCheckData.sessionInfo.sessionId}`);
      console.log(`     PSW Result ID: ${priceCheckData.sessionInfo.pswResultId}`);
    }

    // Step 3: Create folder with init-folder API
    console.log('\n' + '='.repeat(60));
    console.log('\n📍 Step 3: Creating folder via init-folder API...');

    const selectedOption = priceCheckData.priceOptions[0]; // Use first option (ECONOMY LIGHT)
    
    // Build per-passenger pricing from price check
    const passengerPricing = [];
    if (selectedOption.passengerBreakdown && selectedOption.passengerBreakdown.length > 0) {
      for (const breakdown of selectedOption.passengerBreakdown) {
        passengerPricing.push({
          paxType: breakdown.type,
          count: breakdown.count,
          baseFare: breakdown.basePrice,
          taxes: breakdown.taxesPerPerson,
          totalFare: breakdown.totalPrice,
        });
      }
    }

    // Build galileoNotes with actual chargeable status
    const galileoNotes = [];
    const getChargeableText = (chargeable) => {
      switch (chargeable) {
        case 'included': return 'Included in the brand';
        case 'chargeable': return 'Available for a charge';
        case 'not_offered': return 'Not offered';
        default: return '';
      }
    };

    if (selectedOption.mealsService) {
      const svc = selectedOption.mealsService;
      const type = svc.type || 'MealOrBeverage';
      const text = svc.text || 'Meals & Beverages';
      const status = getChargeableText(svc.chargeable);
      galileoNotes.push(`Type: ${type} - ${text}${status ? ` (${status})` : ''}`);
    }

    if (selectedOption.seatServices && selectedOption.seatServices.length > 0) {
      const svc = selectedOption.seatServices[0];
      const text = svc.text || 'Preferred Seat';
      const status = getChargeableText(svc.chargeable);
      galileoNotes.push(`Tag: Seat Assignment - ${text}${status ? ` (${status})` : ''}`);
    }

    if (selectedOption.rebookingService) {
      const svc = selectedOption.rebookingService;
      const text = svc.text || 'Changes';
      const status = getChargeableText(svc.chargeable);
      galileoNotes.push(`Tag: Rebooking - ${text}${status ? ` (${status})` : ''}`);
    }

    console.log('\n   Galileo Notes to be sent:');
    for (const note of galileoNotes) {
      console.log(`     - ${note}`);
    }

    console.log('\n   Passenger Pricing to be sent:');
    for (const pax of passengerPricing) {
      console.log(`     - ${pax.paxType}: ${pax.count} pax, Base: ${pax.baseFare}, Tax: ${pax.taxes}, Total: ${pax.totalFare}`);
    }

    // Build flight segments from first flight
    const flightSegments = [];
    if (firstFlight.outbound) {
      const seg = firstFlight.outbound;
      if (seg.individualFlights && seg.individualFlights.length > 0) {
        for (const leg of seg.individualFlights) {
          flightSegments.push({
            type: 'AIR',
            airlineCode: leg.carrierCode || firstFlight.airline.code,
            flightNumber: leg.flightNumber || '',
            departureAirport: leg.departureAirport || seg.departureAirport?.code,
            arrivalAirport: leg.arrivalAirport || seg.arrivalAirport?.code,
            departureDate: leg.departureDate || seg.date,
            arrivalDate: leg.arrivalDate || seg.date,
            departureTime: leg.departureTime || seg.departureTime,
            arrivalTime: leg.arrivalTime || seg.arrivalTime,
            duration: leg.duration || '',
            cabinClass: seg.cabinClass || 'Economy',
          });
        }
      } else {
        flightSegments.push({
          type: 'AIR',
          airlineCode: firstFlight.airline.code,
          flightNumber: seg.flightNumber || '',
          departureAirport: seg.departureAirport?.code,
          arrivalAirport: seg.arrivalAirport?.code,
          departureDate: seg.date,
          arrivalDate: seg.arrivalDate || seg.date,
          departureTime: seg.departureTime,
          arrivalTime: seg.arrivalTime,
          duration: seg.duration || '',
          cabinClass: seg.cabinClass || 'Economy',
        });
      }
    }
    if (firstFlight.inbound) {
      const seg = firstFlight.inbound;
      if (seg.individualFlights && seg.individualFlights.length > 0) {
        for (const leg of seg.individualFlights) {
          flightSegments.push({
            type: 'AIR',
            airlineCode: leg.carrierCode || firstFlight.airline.code,
            flightNumber: leg.flightNumber || '',
            departureAirport: leg.departureAirport || seg.departureAirport?.code,
            arrivalAirport: leg.arrivalAirport || seg.arrivalAirport?.code,
            departureDate: leg.departureDate || seg.date,
            arrivalDate: leg.arrivalDate || seg.date,
            departureTime: leg.departureTime || seg.departureTime,
            arrivalTime: leg.arrivalTime || seg.arrivalTime,
            duration: leg.duration || '',
            cabinClass: seg.cabinClass || 'Economy',
          });
        }
      } else {
        flightSegments.push({
          type: 'AIR',
          airlineCode: firstFlight.airline.code,
          flightNumber: seg.flightNumber || '',
          departureAirport: seg.departureAirport?.code,
          arrivalAirport: seg.arrivalAirport?.code,
          departureDate: seg.date,
          arrivalDate: seg.arrivalDate || seg.date,
          departureTime: seg.departureTime,
          arrivalTime: seg.arrivalTime,
          duration: seg.duration || '',
          cabinClass: seg.cabinClass || 'Economy',
        });
      }
    }

    console.log(`\n   Flight Segments: ${flightSegments.length}`);
    for (const seg of flightSegments) {
      console.log(`     - ${seg.airlineCode}${seg.flightNumber}: ${seg.departureAirport} -> ${seg.arrivalAirport} on ${seg.departureDate}`);
    }

    // Test passengers - 2 adults + 1 child
    const testPassengers = [
      {
        title: 'Mr',
        firstName: 'John',
        middleName: '',
        lastName: 'Smith',
        dateOfBirth: '1990-05-15',
        email: 'john.smith@example.com',
        phone: '7911123456',
        countryCode: '+44',
        type: 'adult',
      },
      {
        title: 'Mrs',
        firstName: 'Jane',
        middleName: '',
        lastName: 'Smith',
        dateOfBirth: '1992-08-20',
        email: 'jane.smith@example.com',
        phone: '7911123457',
        countryCode: '+44',
        type: 'adult',
      },
      {
        title: 'Miss',
        firstName: 'Emma',
        middleName: '',
        lastName: 'Smith',
        dateOfBirth: '2018-03-10',
        email: 'john.smith@example.com',
        phone: '7911123456',
        countryCode: '+44',
        type: 'child',
      },
    ];

    const initFolderBody = {
      passengers: testPassengers,
      currency: selectedOption.currency,
      pswResultId: priceCheckData.sessionInfo.pswResultId,
      destinationAirportCode: priceCheckData.flightDetails.destination,
      departureDate: firstFlight.outbound?.date || '2026-01-21',
      fareSelectedPrice: selectedOption.totalPrice,
      flightSegments,
      originAirportCode: priceCheckData.flightDetails.origin,
      airlineCode: firstFlight.airline.code,
      airlineName: firstFlight.airline.name,
      // Portal API fields
      markupIds: '',
      moduleId: firstFlight.moduleId || '',
      cabinClassCode: selectedOption.bookingCode || 'Y',
      affiliateCode: '',
      selectedBrandName: selectedOption.cabinClassDisplay,
      baggageInfo: selectedOption.baggage?.description || '',
      refundableInfo: selectedOption.refundableText || '',
      baseFare: selectedOption.baseFare,
      taxes: selectedOption.taxes,
      galileoNotes,
      gds: priceCheckData.rawResponse?.priceCheck?.gds || '',
      chooseSupplier: priceCheckData.rawResponse?.priceCheck?.ChooseSupplier || '',
      passengerPricing,
    };

    console.log('\n   Init Folder Request Summary:');
    console.log(`     Passengers: ${testPassengers.length}`);
    console.log(`     Currency: ${initFolderBody.currency}`);
    console.log(`     PSW Result ID: ${initFolderBody.pswResultId}`);
    console.log(`     Total Price: ${initFolderBody.fareSelectedPrice}`);
    console.log(`     Brand: ${initFolderBody.selectedBrandName}`);
    console.log(`     Baggage: ${initFolderBody.baggageInfo}`);
    console.log(`     GDS: ${initFolderBody.gds}`);
    console.log(`     Passenger Pricing entries: ${passengerPricing.length}`);
    console.log(`     Galileo Notes: ${galileoNotes.length}`);

    const initFolderResponse = await fetch(`${LOCAL_API_URL}/api/vyspa/init-folder`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(initFolderBody),
    });

    console.log(`\n   Response status: ${initFolderResponse.status}`);

    const initFolderData = await initFolderResponse.json();

    if (!initFolderResponse.ok) {
      console.error('❌ Init folder failed');
      console.error('   Error:', JSON.stringify(initFolderData, null, 2).substring(0, 1000));
      return;
    }

    console.log('✅ Folder created successfully!');
    console.log(`   Folder Number: ${initFolderData.folderNumber}`);
    console.log(`   Customer ID: ${initFolderData.customerId}`);
    console.log(`   Email: ${initFolderData.emailAddress}`);

    // Show folder details if available
    if (initFolderData.folderDetails) {
      const fd = initFolderData.folderDetails;
      console.log('\n   Folder Details:');
      
      // Check for segments in the folder
      if (fd.FolderItem && Array.isArray(fd.FolderItem)) {
        const airSegments = fd.FolderItem.filter(item => item.fi_type === 'AIR');
        const tktSegments = fd.FolderItem.filter(item => item.fi_type === 'TKT');
        
        console.log(`     AIR Segments: ${airSegments.length}`);
        console.log(`     TKT Segments: ${tktSegments.length}`);
        
        if (tktSegments.length > 0) {
          console.log('\n   TKT Segments in folder:');
          for (const tkt of tktSegments) {
            console.log(`     - Pax ${tkt.pax_no} (${tkt.gds_pax_type_code}): ${tkt.start_point_code} -> ${tkt.end_point_code}`);
            if (tkt.FolderPricing && Array.isArray(tkt.FolderPricing)) {
              for (const pricing of tkt.FolderPricing) {
                console.log(`       ${pricing.desc}: ${pricing.tot_sell_amt} ${pricing.cu_curr_code}`);
              }
            }
          }
        }
      }
      
      // Check for comments
      if (fd.FolderComment && Array.isArray(fd.FolderComment)) {
        console.log(`\n   Folder Comments: ${fd.FolderComment.length}`);
        for (const comment of fd.FolderComment.slice(0, 10)) {
          console.log(`     - ${comment.comment_text?.substring(0, 80) || '(empty)'}`);
        }
      }
    }

    console.log('\n' + '='.repeat(60));
    console.log('✅ End-to-end test completed successfully!');
    console.log('\n   Summary:');
    console.log(`   1. Search: Found ${flights.length} flights`);
    console.log(`   2. Price Check: ${priceCheckData.priceOptions.length} options with direct key`);
    console.log(`   3. Folder Created: ${initFolderData.folderNumber}`);
    console.log(`   4. Per-passenger TKT segments: ${passengerPricing.length} types`);
    console.log(`   5. Galileo Notes with status: ${galileoNotes.length} notes`);

  } catch (error) {
    console.error('❌ Test error:', error.message);
    console.error(error);
  }
}

main();

