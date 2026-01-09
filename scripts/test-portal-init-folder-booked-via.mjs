/**
 * Test: Portal init-folder booked_via normalization (G/X -> Galileo/Sabre)
 *
 * This script calls the local Next route `/api/vyspa/init-folder` so we exercise:
 * client payload -> route sanitization -> REAL Portal `saveBasketToFolder` request.
 *
 * Prereq: run `npm run dev` with PORT=3005 (already running in this repo).
 *
 * Note: This will create actual folders in the Portal system.
 * Use test credentials / test environment if available.
 */

const BASE_URL = process.env.LOCAL_BASE_URL || 'http://localhost:3005';

function makeBody({ gds, chooseSupplier }) {
  const today = new Date();
  const depart = new Date(today.getTime() + 14 * 24 * 60 * 60 * 1000);
  const yyyy = depart.getUTCFullYear();
  const mm = String(depart.getUTCMonth() + 1).padStart(2, '0');
  const dd = String(depart.getUTCDate()).padStart(2, '0');
  const departureDate = `${yyyy}-${mm}-${dd}`;

  return {
    passengers: [
      {
        title: 'Mr',
        firstName: 'GDS',
        middleName: '',
        lastName: `TEST-${gds}`,
        dateOfBirth: '1990-01-01',
        email: `gds.test+${gds}.${Date.now()}@example.com`,
        phone: '07123456789',
        countryCode: '+44',
        type: 'adult',
      },
    ],
    currency: 'GBP',
    pswResultId: `GDS_TEST_${Date.now()}`,
    destinationAirportCode: 'JFK',
    departureDate,
    fareSelectedPrice: 1234,
    cabinClass: 'Economy',
    affiliateCode: 'gds_test_script',
    originAirportCode: 'LHR',
    airlineCode: 'BA',
    airlineName: 'British Airways',
    flightSegments: [
      {
        type: 'AIR',
        airlineCode: 'BA',
        flightNumber: '0105',
        departureAirport: 'LHR',
        arrivalAirport: 'JFK',
        departureDate,
        arrivalDate: departureDate,
        departureTime: '10:00',
        arrivalTime: '13:00',
        duration: '7h 0m',
        cabinClass: 'Economy',
      },
    ],
    // The fields we care about:
    gds,
    chooseSupplier,
  };
}

async function runOne({ gds, chooseSupplier }) {
  const url = new URL('/api/vyspa/init-folder', BASE_URL).toString();
  const body = makeBody({ gds, chooseSupplier });

  console.log('\n==============================');
  console.log('Calling init-folder with:', { gds, chooseSupplier, url });

  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  const json = await res.json().catch(() => null);
  console.log('Status:', res.status, res.statusText);

  const bookedVia =
    json?.folderDetails?.pagedata?.find?.((p) => p?.Segment?.fi_type === 'TKT')?.Segment?.booked_via ??
    json?.createFolderRaw?.folder_data?.pagedata?.find?.((p) => p?.Segment?.fi_type === 'TKT')?.Segment?.booked_via ??
    null;

  console.log('Folder:', json?.folderNumber);
  console.log('booked_via (TKT):', bookedVia);
  if (!bookedVia) {
    console.log('Response (truncated):', {
      folderNumber: json?.folderNumber,
      hasFolderDetails: !!json?.folderDetails,
      hasCreateFolderRaw: !!json?.createFolderRaw,
    });
  }
  return { res, json };
}

async function main() {
  // Case 1: Galileo (G)
  await runOne({ gds: 'G', chooseSupplier: 'GALNEW' });

  // Case 2: Sabre (X)
  await runOne({ gds: 'X', chooseSupplier: 'SABNEW' });
}

main().catch((err) => {
  console.error('Script failed:', err);
  process.exitCode = 1;
});


