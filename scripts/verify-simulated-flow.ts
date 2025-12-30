import { getRegionFromHost } from '../src/lib/utils/domainMapping.ts';
import { getMarketSourceMapping } from '../src/lib/utils/affiliateMapping.ts';
import { AFFILIATE_DATA } from '../src/data/affiliates.ts';

async function verifySimulatedFlow() {
  console.log('🧪 Verifying Simulated Domain Flow...');
  
  // 1. Check if domain simulation works
  const simulatedDomain = process.env.SIMULATE_DOMAIN || 'globehunters.com.au';
  console.log(`🌍 Simulated Domain: ${simulatedDomain}`);
  
  const detectedRegion = getRegionFromHost('localhost'); // Should pick up env var
  console.log(`📍 Detected Region (from localhost + env): ${detectedRegion}`);
  
  if (detectedRegion !== 'AU') {
    console.error('❌ Failed to simulate AU region via environment variable');
    // Note: Since we are running this script directly with tsx, it might not pick up .env file automatically
    // unless we load it. But getRegionFromHost reads process.env.SIMULATE_DOMAIN.
    // We'll set it manually for this test script context just in case.
    process.env.SIMULATE_DOMAIN = 'globehunters.com.au';
    const retryRegion = getRegionFromHost('localhost');
    console.log(`📍 Retry Detected Region: ${retryRegion}`);
    
    if (retryRegion !== 'AU') {
        console.error('❌ Still failing to detect AU region. Check getRegionFromHost logic.');
        return;
    }
  }
  
  console.log('✅ Domain simulation working');

  // 2. Verify Affiliate Code Resolution
  console.log('\n🔍 Verifying Affiliate Resolution...');
  const testAffiliateCode = 'skapi'; // Skyscanner AU from CSV
  
  const affiliate = AFFILIATE_DATA.find(a => a.Aff_TrackingCode === testAffiliateCode);
  
  if (!affiliate) {
    console.error(`❌ Could not find affiliate code ${testAffiliateCode} in static data`);
    return;
  }
  
  console.log(`✅ Found Affiliate: ${affiliate.Aff_Name} (${affiliate.Aff_TrackingCode})`);
  
  // 3. Verify Market Source Mapping
  console.log('\n🗺️ Verifying Market Source Mapping...');
  const mapping = getMarketSourceMapping(testAffiliateCode, detectedRegion, 'Economy');
  
  console.log(`   Mapping Result for ${testAffiliateCode} / ${detectedRegion} / Economy:`);
  console.log(`   Source ID: ${mapping.sourceId}`);
  console.log(`   Sub-Source ID: ${mapping.subSourceId}`);
  
  // Expected: Skyscanner (17) -> AU (34)
  if (mapping.sourceId === '17' && mapping.subSourceId === '34') {
    console.log('✅ Mapping is CORRECT (Matches CSV row 2)');
  } else {
    console.error(`❌ Mapping MISMATCH. Expected 17/34, got ${mapping.sourceId}/${mapping.subSourceId}`);
  }

  // 4. Verify another one: Kayak AU
  const testAffiliateCode2 = 'kauap'; // Kayak AU
  const mapping2 = getMarketSourceMapping(testAffiliateCode2, 'AU', 'Business');
  console.log(`\n   Mapping Result for ${testAffiliateCode2} / AU / Business:`);
  console.log(`   Source ID: ${mapping2.sourceId} (Expected 50)`);
  console.log(`   Sub-Source ID: ${mapping2.subSourceId} (Expected 57)`);
  
  if (mapping2.sourceId === '50' && mapping2.subSourceId === '57') {
      console.log('✅ Mapping is CORRECT');
  } else {
      console.error('❌ Mapping MISMATCH');
  }
}

verifySimulatedFlow();

