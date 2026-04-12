export type CabinClassName = 'Economy' | 'Premium Economy' | 'Business' | 'First';

export const CABIN_CLASS_DATA = {
  Economy: { displayName: 'Economy' },
  'Premium Economy': { displayName: 'Premium Economy' },
  Business: { displayName: 'Business' },
  First: { displayName: 'First' },
} as const;

export function normalizeCabinClass(cabinClass?: string | null): string {
  if (!cabinClass) return 'Economy';

  const normalized = String(cabinClass).trim().toUpperCase();

  switch (normalized) {
    case 'Y':
    case 'M':
    case 'ECONOMY':
    case 'ECO':
      return 'Economy';
    case 'W':
    case 'S':
    case 'PREMIUM ECONOMY':
    case 'PREMIUM':
    case 'PREMIUMECONOMY':
      return 'Premium Economy';
    case 'C':
    case 'J':
    case 'BUSINESS':
    case 'BUS':
      return 'Business';
    case 'F':
    case 'P':
    case 'A':
    case 'FIRST':
    case 'FIRSTCLASS':
      return 'First';
    case 'NOT SPECIFIED':
    case 'NOTSPECIFIED':
    case '':
      return 'Economy';
    default:
      if (normalized.includes('ECONOMY')) return 'Economy';
      if (normalized.includes('BUSINESS')) return 'Business';
      if (normalized.includes('FIRST')) return 'First';
      if (normalized.includes('PREMIUM')) return 'Premium Economy';
      return 'Economy';
  }
}

export function cabinClassToVyspaNumeric(name: string): string {
  const classMap: Record<string, string> = {
    'Economy': '1',
    'Premium Economy': '2',
    'Business': '3',
    'First': '4',
  };
  return classMap[name] || '1';
}

export function cabinClassToVyspaLetter(name: string): string {
  const map: Record<string, string> = {
    'Economy': 'M',
    'Premium Economy': 'W',
    'Business': 'C',
    'First': 'F',
  };
  return map[name] || 'M';
}

export function cabinClassToPortalLetter(name: string): string {
  const cc = name?.toLowerCase() || '';
  if (cc.includes('first')) return 'F';
  if (cc.includes('business')) return 'C';
  if (cc.includes('premium')) return 'W';
  return 'Y';
}

export function cabinCodeToDisplayName(code: string): CabinClassName {
  const c = String(code).trim().toUpperCase();

  const letterMap: Record<string, CabinClassName> = {
    'F': 'First', 'A': 'First', 'P': 'First',
    'C': 'Business', 'J': 'Business', 'D': 'Business', 'I': 'Business', 'Z': 'Business',
    'W': 'Premium Economy', 'S': 'Premium Economy',
    'Y': 'Economy', 'M': 'Economy', 'H': 'Economy', 'B': 'Economy',
    'K': 'Economy', 'L': 'Economy', 'Q': 'Economy', 'T': 'Economy',
    'U': 'Economy', 'V': 'Economy', 'X': 'Economy', 'E': 'Economy',
    'G': 'Economy', 'N': 'Economy', 'O': 'Economy', 'R': 'Economy',
  };

  if (letterMap[c]) return letterMap[c];

  if (c === '2') return 'Business';
  if (c === '3') return 'Premium Economy';
  if (c === '4') return 'Economy';
  if (c === '1') return 'Economy';

  return 'Economy';
}

export const CABIN_CLASS_MAP: Record<string, CabinClassName> = {
  'economy': 'Economy',
  'premium': 'Premium Economy',
  'premium economy': 'Premium Economy',
  'business': 'Business',
  'first': 'First',
  'y': 'Economy',
  'm': 'Economy',
  'w': 'Premium Economy',
  's': 'Premium Economy',
  'c': 'Business',
  'j': 'Business',
  'f': 'First',
  'a': 'First',
};

export function getCabinClassSubsource(cabinClass: string): string {
  const cabinMap: Record<string, string> = {
    'Economy': '122',
    'Premium Economy': '123',
    'Business': '124',
    'First': '125',
  };

  const normalized = cabinClass?.toLowerCase().trim();

  if (normalized?.includes('premium')) return cabinMap['Premium Economy'];
  if (normalized?.includes('business')) return cabinMap['Business'];
  if (normalized?.includes('first')) return cabinMap['First'];

  return cabinMap['Economy'];
}
