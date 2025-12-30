import { getRegion } from './domainMapping';

// Type definitions for mapping keys
export type RegionCode = 'AU' | 'NZ' | 'US' | 'CA' | 'MX' | 'IE' | 'ZA' | 'UK' | 'ROW';
export type CabinClass = 'Economy' | 'Premium Economy' | 'Business' | 'First';
export type AffiliateName = 'Skyscanner' | 'Kayak' | 'Momondo' | 'CheapFlight' | 'GH' | 'Jetcost' | 'Default';

export interface MarketSourceInfo {
  sourceId: string;
  subSourceId: string;
}

// Normalized input types
interface AffiliateMappingInput {
  affiliateCode?: string | null;
  region?: string;
  cabinClass?: string;
}

// Map cabin class strings to standardized keys
const CABIN_CLASS_MAP: Record<string, CabinClass> = {
  'economy': 'Economy',
  'premium': 'Premium Economy',
  'premium economy': 'Premium Economy',
  'business': 'Business',
  'first': 'First',
  // Short codes
  'y': 'Economy',
  'm': 'Economy',
  'w': 'Premium Economy',
  's': 'Premium Economy',
  'c': 'Business',
  'j': 'Business',
  'f': 'First',
  'a': 'First'
};

// Default mapping (CheapFlight AU Eco)
const DEFAULT_MAPPING: MarketSourceInfo = {
  sourceId: '117',
  subSourceId: '122'
};

// Affiliate code to name mapping
// Strictly based on Globehunters Affiliate.csv and CRM_Affilate Details (1).csv
const AFFILIATE_CODE_MAP: Record<string, AffiliateName> = {
  // Skyscanner
  'skyscannerapi': 'Skyscanner',
  'skyap': 'Skyscanner', // Skyscanner NZ
  'skapi': 'Skyscanner', // Skyscanner AU
  'skymx': 'Skyscanner', // Skyscanner MX
  'skie': 'Skyscanner', // Skyscanner IE
  'skap': 'Skyscanner', // Skyscanner USA
  'skyca': 'Skyscanner', // Skyscanner CA

  // Kayak
  'kuapi': 'Kayak', // Kayak UK
  'kasa': 'Kayak', // Kayak ZA
  'kauap': 'Kayak', // Kayak AU

  // Momondo
  'momondo': 'Momondo', // Momondo UK
  'monz': 'Momondo', // Momondo NZ
  'moza': 'Momondo', // Momondo ZA
  'moau': 'Momondo', // Momondo AU

  // CheapFlights
  'cheapflightsapi': 'CheapFlight', // Cheapflights UK
  'cfnz': 'CheapFlight', // Cheapflights NZ
  'cfza': 'CheapFlight', // Cheapflights ZA
  'cfau': 'CheapFlight', // Cheapflights AU

  // Jetcost
  'jetcostuk': 'Jetcost',
  'jetcostau': 'Jetcost',
  'jetcostusa': 'Jetcost',

  // GH (From CRM mapping, though not in Affiliate CSV)
  'gh': 'GH',
  'gh website': 'GH'
};

// The main mapping table derived from CRM_Affilate Details.csv
// Structure: [AffiliateName][Region][CabinClass] -> subSourceId
// sourceId is stored separately for each affiliate
const AFFILIATE_CONFIG: Record<AffiliateName, {
  sourceId: string;
  subSources: Record<string, Record<CabinClass, string>>;
}> = {
  'Skyscanner': {
    sourceId: '17',
    subSources: {
      'AU': {
        'Economy': '34',
        'Premium Economy': '35',
        'Business': '36',
        'First': '37'
      },
      'NZ': {
        'Economy': '30',
        'Premium Economy': '31',
        'Business': '32',
        'First': '33'
      },
      'US': {
        'Economy': '26',
        'Premium Economy': '27',
        'Business': '28',
        'First': '29'
      },
      'CA': {
        'Economy': '22',
        'Premium Economy': '23',
        'Business': '24',
        'First': '25'
      },
      'MX': {
        'Economy': '38',
        'Premium Economy': '39',
        'Business': '40',
        'First': '41'
      },
      'IE': {
        'Economy': '42',
        'Premium Economy': '43',
        'Business': '44',
        'First': '45'
      },
      'UK': {
        'Economy': '18',
        'Premium Economy': '19',
        'Business': '20',
        'First': '21'
      }
    }
  },
  'Kayak': {
    sourceId: '50',
    subSources: {
      'AU': {
        'Economy': '55',
        'Premium Economy': '56',
        'Business': '57',
        'First': '58'
      },
      'NZ': {
        'Economy': '59',
        'Premium Economy': '60',
        'Business': '61',
        'First': '62'
      },
      'CA': {
        'Economy': '67',
        'Premium Economy': '68',
        'Business': '70',
        'First': '71'
      },
      'ZA': {
        'Economy': '80',
        'Premium Economy': '81',
        'Business': '82',
        'First': '83'
      },
      'UK': {
        'Economy': '51',
        'Premium Economy': '52',
        'Business': '53',
        'First': '54'
      }
    }
  },
  'Momondo': {
    sourceId: '84',
    subSources: {
      'AU': {
        'Economy': '89',
        'Premium Economy': '90',
        'Business': '91',
        'First': '92'
      },
      'NZ': {
        'Economy': '93',
        'Premium Economy': '94',
        'Business': '95',
        'First': '96'
      },
      'ZA': {
        'Economy': '113',
        'Premium Economy': '114',
        'Business': '115',
        'First': '116'
      },
      'UK': {
        'Economy': '85',
        'Premium Economy': '86',
        'Business': '87',
        'First': '88'
      }
    }
  },
  'CheapFlight': {
    sourceId: '117',
    subSources: {
      'AU': {
        'Economy': '122',
        'Premium Economy': '123',
        'Business': '124',
        'First': '125'
      },
      'NZ': {
        'Economy': '126',
        'Premium Economy': '127',
        'Business': '128',
        'First': '129'
      },
      'CA': {
        'Economy': '134',
        'Premium Economy': '135',
        'Business': '136',
        'First': '137'
      },
      'UK': {
        'Economy': '118',
        'Premium Economy': '119',
        'Business': '120',
        'First': '121'
      }
    }
  },
  'GH': {
    sourceId: '155',
    subSources: {
      'NZ': {
        'Economy': '168',
        'Premium Economy': '169',
        'Business': '170',
        'First': '171'
      },
      'CA': {
        'Economy': '164',
        'Premium Economy': '165',
        'Business': '166',
        'First': '167'
      },
      'ZA': {
        'Economy': '172',
        'Premium Economy': '173',
        'Business': '174',
        'First': '175'
      },
      'IE': {
        'Economy': '176',
        'Premium Economy': '180',
        'Business': '178',
        'First': '180'
      },
      'AU': {
        'Economy': '160',
        'Premium Economy': '161',
        'Business': '162',
        'First': '163'
      },
      'US': {
        'Economy': '156',
        'Premium Economy': '157',
        'Business': '158',
        'First': '159'
      },
      'UK': {
        'Economy': '184',
        'Premium Economy': '181',
        'Business': '182',
        'First': '183'
      }
    }
  },
  'Jetcost': {
    sourceId: '198',
    subSources: {
      'AU': {
        'Economy': '217',
        'Premium Economy': '214',
        'Business': '216',
        'First': '215'
      },
      'US': {
        'Economy': '225',
        'Premium Economy': '222',
        'Business': '224',
        'First': '223'
      },
      'UK': {
        'Economy': '221',
        'Premium Economy': '218',
        'Business': '220',
        'First': '219'
      }
    }
  },
  'Default': {
    sourceId: '117',
    subSources: {
      'Default': {
        'Economy': '122',
        'Premium Economy': '123',
        'Business': '124',
        'First': '125'
      }
    }
  }
};

/**
 * Get market source and subsource IDs based on affiliate, region and cabin class.
 */
export function getMarketSourceMapping(
  affiliateCode: string | null | undefined,
  regionCode: string = 'UK',
  cabinClass: string = 'Economy'
): MarketSourceInfo {
  
  // 1. Determine Affiliate Name
  let affiliateName: AffiliateName = 'Default';
  if (affiliateCode) {
    const normalizedCode = affiliateCode.toLowerCase().trim();
    // Try exact match in map
    if (AFFILIATE_CODE_MAP[normalizedCode]) {
      affiliateName = AFFILIATE_CODE_MAP[normalizedCode];
    } else {
      // Try partial matches
      for (const [key, val] of Object.entries(AFFILIATE_CODE_MAP)) {
        if (normalizedCode.includes(key)) {
          affiliateName = val;
          break;
        }
      }
    }
  }

  // 2. Determine Cabin Class
  let normalizedCabin: CabinClass = 'Economy';
  const cabinInput = cabinClass.toLowerCase().trim();
  
  // Check exact matches in map
  if (CABIN_CLASS_MAP[cabinInput]) {
    normalizedCabin = CABIN_CLASS_MAP[cabinInput];
  } else {
    // Check for substrings
    if (cabinInput.includes('premium')) normalizedCabin = 'Premium Economy';
    else if (cabinInput.includes('business')) normalizedCabin = 'Business';
    else if (cabinInput.includes('first')) normalizedCabin = 'First';
  }

  // 3. Look up config
  const config = AFFILIATE_CONFIG[affiliateName];
  if (!config) {
    return DEFAULT_MAPPING;
  }

  // 4. Look up subsource for region
  let subSources = config.subSources[regionCode];
  
  // If region not found for this affiliate, try to fallback
  if (!subSources) {
    // If 'UKHQ' was passed but we only have 'UK', try that (handled by caller mostly, but safe to check)
    if (regionCode === 'UKHQ' && config.subSources['UK']) {
      subSources = config.subSources['UK'];
    }
    // Fallback strategy: Try finding 'UK', 'AU', 'US'
    else if (config.subSources['UK']) subSources = config.subSources['UK'];
    else if (config.subSources['AU']) subSources = config.subSources['AU'];
    else if (config.subSources['US']) subSources = config.subSources['US'];
    else {
      // If absolutely no subsource found, fall back to global default
      return {
        sourceId: config.sourceId,
        subSourceId: DEFAULT_MAPPING.subSourceId 
      };
    }
  }

  const subSourceId = subSources[normalizedCabin];

  return {
    sourceId: config.sourceId,
    subSourceId: subSourceId || DEFAULT_MAPPING.subSourceId
  };
}
