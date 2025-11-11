/**
 * Aircraft Type Code Mappings
 * Maps IATA aircraft type codes to human-readable names
 */

export const AIRCRAFT_TYPE_MAP: Record<string, string> = {
  // Airbus
  '310': 'Airbus A310',
  '318': 'Airbus A318',
  '319': 'Airbus A319',
  '320': 'Airbus A320',
  '321': 'Airbus A321',
  '32N': 'Airbus A320neo',
  '32A': 'Airbus A320neo',
  '32Q': 'Airbus A321neo',
  '332': 'Airbus A330-200',
  '333': 'Airbus A330-300',
  '338': 'Airbus A330-800neo',
  '339': 'Airbus A330-900neo',
  '342': 'Airbus A340-200',
  '343': 'Airbus A340-300',
  '345': 'Airbus A340-500',
  '346': 'Airbus A340-600',
  '359': 'Airbus A350-900',
  '35K': 'Airbus A350-1000',
  '380': 'Airbus A380',
  
  // Boeing
  '703': 'Boeing 707',
  '717': 'Boeing 717',
  '721': 'Boeing 727-100',
  '722': 'Boeing 727-200',
  '731': 'Boeing 737-100',
  '732': 'Boeing 737-200',
  '733': 'Boeing 737-300',
  '734': 'Boeing 737-400',
  '735': 'Boeing 737-500',
  '736': 'Boeing 737-600',
  '737': 'Boeing 737-700',
  '738': 'Boeing 737-800',
  '739': 'Boeing 737-900',
  '73C': 'Boeing 737-300',
  '73G': 'Boeing 737-700',
  '73H': 'Boeing 737-800',
  '73J': 'Boeing 737-900',
  '73W': 'Boeing 737-700',
  '73X': 'Boeing 737-MAX',
  '7M7': 'Boeing 737 MAX 7',
  '7M8': 'Boeing 737 MAX 8',
  '7M9': 'Boeing 737 MAX 9',
  '7MJ': 'Boeing 737 MAX 10',
  '741': 'Boeing 747-100',
  '742': 'Boeing 747-200',
  '743': 'Boeing 747-300',
  '744': 'Boeing 747-400',
  '747': 'Boeing 747',
  '74E': 'Boeing 747-400',
  '74H': 'Boeing 747-8',
  '757': 'Boeing 757',
  '752': 'Boeing 757-200',
  '753': 'Boeing 757-300',
  '75W': 'Boeing 757-200',
  '762': 'Boeing 767-200',
  '763': 'Boeing 767-300',
  '764': 'Boeing 767-400',
  '767': 'Boeing 767',
  '76W': 'Boeing 767-300',
  '772': 'Boeing 777-200',
  '773': 'Boeing 777-300',
  '777': 'Boeing 777',
  '77L': 'Boeing 777-200LR',
  '77W': 'Boeing 777-300ER',
  '788': 'Boeing 787-8',
  '789': 'Boeing 787-9',
  '78J': 'Boeing 787-10',
  '787': 'Boeing 787 Dreamliner',
  
  // Embraer
  '190': 'Embraer 190',
  '195': 'Embraer 195',
  'E70': 'Embraer 170',
  'E75': 'Embraer 175',
  'E90': 'Embraer 190',
  'E95': 'Embraer 195',
  'ER3': 'Embraer ERJ 135',
  'ER4': 'Embraer ERJ 145',
  'ERD': 'Embraer ERJ 140',
  'ERJ': 'Embraer ERJ 145',
  
  // Bombardier/De Havilland
  'CR2': 'Bombardier CRJ-200',
  'CR7': 'Bombardier CRJ-700',
  'CR9': 'Bombardier CRJ-900',
  'CRJ': 'Bombardier CRJ',
  'CRK': 'Bombardier CRJ-1000',
  'DH1': 'De Havilland DHC-1',
  'DH2': 'De Havilland DHC-2',
  'DH3': 'De Havilland DHC-3',
  'DH4': 'De Havilland DHC-4',
  'DH8': 'De Havilland Dash 8',
  'DHC': 'De Havilland DHC-6',
  
  // ATR
  'AT4': 'ATR 42',
  'AT5': 'ATR 42-500',
  'AT7': 'ATR 72',
  'AT9': 'ATR 72-600',
  'ATR': 'ATR',
  
  // Other Common Aircraft
  'SU9': 'Sukhoi Superjet 100',
  'SSJ': 'Sukhoi Superjet 100',
  '223': 'Airbus A220-300',
  '290': 'Embraer E190-E2',
  '295': 'Embraer E195-E2',
};

/**
 * Get human-readable aircraft name from code
 * @param code IATA aircraft type code (e.g., "333", "73H", "788")
 * @returns Human-readable aircraft name or the code if not found
 */
export function getAircraftName(code: string | number | null | undefined): string {
  if (!code) return '';
  
  const codeStr = String(code).trim().toUpperCase();
  
  // Return mapped name if available, otherwise return the code
  return AIRCRAFT_TYPE_MAP[codeStr] || codeStr;
}



