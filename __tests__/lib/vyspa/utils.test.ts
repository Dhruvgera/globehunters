/**
 * Unit Tests for Vyspa Utils
 */

import {
  convertDateFormat,
  generateChildAges,
  parsePriceValue,
  formatTime,
  parseIntSafe,
  calculateDuration,
  formatDuration,
  isValidAirportCode,
  isValidDateFormat,
  parsePriceBreakdownString,
  normalizeAirportCode,
} from '@/lib/vyspa/utils';

describe('convertDateFormat', () => {
  it('should convert DD/MM/YYYY to YYYY-MM-DD', () => {
    expect(convertDateFormat('01/12/2025')).toBe('2025-12-01');
    expect(convertDateFormat('25/11/2025')).toBe('2025-11-25');
  });

  it('should handle single digit dates', () => {
    expect(convertDateFormat('1/1/2025')).toBe('2025-01-01');
    expect(convertDateFormat('5/3/2025')).toBe('2025-03-05');
  });

  it('should return as-is if already in YYYY-MM-DD format', () => {
    expect(convertDateFormat('2025-12-01')).toBe('2025-12-01');
  });

  it('should handle invalid formats gracefully', () => {
    expect(convertDateFormat('invalid')).toBe('invalid');
  });
});

describe('generateChildAges', () => {
  it('should generate array of default ages', () => {
    expect(generateChildAges(0)).toEqual([]);
    expect(generateChildAges(1)).toEqual(['9']);
    expect(generateChildAges(3)).toEqual(['9', '9', '9']);
  });

  it('should handle negative numbers', () => {
    expect(generateChildAges(-1)).toEqual([]);
  });
});

describe('parsePriceValue', () => {
  it('should parse numbers', () => {
    expect(parsePriceValue(100)).toBe(100);
    expect(parsePriceValue(99.99)).toBe(99.99);
  });

  it('should parse strings with currency symbols', () => {
    expect(parsePriceValue('$100')).toBe(100);
    expect(parsePriceValue('£99.99')).toBe(99.99);
    expect(parsePriceValue('€1,234.56')).toBe(1234.56);
  });

  it('should handle comma as decimal separator', () => {
    expect(parsePriceValue('99,99')).toBe(99.99);
    expect(parsePriceValue('1234,56')).toBe(1234.56);
  });

  it('should handle comma as thousand separator', () => {
    expect(parsePriceValue('1,234.56')).toBe(1234.56);
    expect(parsePriceValue('10,000.00')).toBe(10000);
  });

  it('should handle null/undefined', () => {
    expect(parsePriceValue(null)).toBe(0);
    expect(parsePriceValue(undefined)).toBe(0);
    expect(parsePriceValue('')).toBe(0);
  });

  it('should use fallback for invalid values', () => {
    expect(parsePriceValue('invalid', 50)).toBe(50);
  });

  it('should round to 2 decimal places', () => {
    expect(parsePriceValue(99.999)).toBe(100);
    expect(parsePriceValue(99.991)).toBe(99.99);
  });
});

describe('formatTime', () => {
  it('should format HHMM to HH:MM', () => {
    expect(formatTime('1330')).toBe('13:30');
    expect(formatTime('0905')).toBe('09:05');
    expect(formatTime('2359')).toBe('23:59');
  });

  it('should handle times without leading zeros', () => {
    expect(formatTime('130')).toBe('01:30');
    expect(formatTime('5')).toBe('00:05');
  });

  it('should return empty for empty input', () => {
    expect(formatTime('')).toBe('');
  });

  it('should return as-is if already formatted', () => {
    expect(formatTime('13:30')).toBe('13:30');
  });
});

describe('parseIntSafe', () => {
  it('should parse valid integers', () => {
    expect(parseIntSafe('123')).toBe(123);
    expect(parseIntSafe(456)).toBe(456);
  });

  it('should use fallback for invalid values', () => {
    expect(parseIntSafe('invalid')).toBe(0);
    expect(parseIntSafe(null)).toBe(0);
    expect(parseIntSafe(undefined)).toBe(0);
    expect(parseIntSafe('invalid', 99)).toBe(99);
  });

  it('should handle string numbers', () => {
    expect(parseIntSafe('42')).toBe(42);
    expect(parseIntSafe('0')).toBe(0);
  });
});

describe('calculateDuration', () => {
  it('should calculate duration in minutes', () => {
    const duration = calculateDuration('2025-12-01', '10:00', '2025-12-01', '12:30');
    expect(duration).toBe(150); // 2.5 hours
  });

  it('should handle overnight flights', () => {
    const duration = calculateDuration('2025-12-01', '23:00', '2025-12-02', '01:00');
    expect(duration).toBe(120); // 2 hours
  });

  it('should return 0 for invalid inputs', () => {
    const duration = calculateDuration('invalid', '10:00', '2025-12-01', '12:00');
    expect(duration).toBe(0);
  });
});

describe('formatDuration', () => {
  it('should format minutes to hours and minutes', () => {
    expect(formatDuration(90)).toBe('1h 30m');
    expect(formatDuration(120)).toBe('2h');
    expect(formatDuration(45)).toBe('45m');
    expect(formatDuration(0)).toBe('0m');
  });

  it('should handle large durations', () => {
    expect(formatDuration(600)).toBe('10h');
    expect(formatDuration(1440)).toBe('24h');
  });
});

describe('isValidAirportCode', () => {
  it('should validate 3-letter codes', () => {
    expect(isValidAirportCode('LHR')).toBe(true);
    expect(isValidAirportCode('JFK')).toBe(true);
    expect(isValidAirportCode('BOM')).toBe(true);
  });

  it('should accept lowercase', () => {
    expect(isValidAirportCode('lhr')).toBe(true);
    expect(isValidAirportCode('jfk')).toBe(true);
  });

  it('should reject invalid codes', () => {
    expect(isValidAirportCode('LH')).toBe(false);
    expect(isValidAirportCode('LHRX')).toBe(false);
    expect(isValidAirportCode('123')).toBe(false);
    expect(isValidAirportCode('')).toBe(false);
  });
});

describe('isValidDateFormat', () => {
  it('should validate DD/MM/YYYY format', () => {
    expect(isValidDateFormat('01/12/2025')).toBe(true);
    expect(isValidDateFormat('25/11/2025')).toBe(true);
  });

  it('should reject invalid formats', () => {
    expect(isValidDateFormat('2025-12-01')).toBe(false);
    expect(isValidDateFormat('1/12/2025')).toBe(false); // Single digit
    expect(isValidDateFormat('01-12-2025')).toBe(false);
    expect(isValidDateFormat('invalid')).toBe(false);
  });
});

describe('parsePriceBreakdownString', () => {
  it('should parse breakdown string', () => {
    const result = parsePriceBreakdownString('ADT~2~143.00~252.92~0.00~0.00~395.92~0');
    expect(result).toHaveLength(1);
    expect(result[0].paxType).toBe('ADT');
    expect(result[0].count).toBe(2);
    expect(result[0].totalPrice).toBe(395.92);
  });

  it('should parse multiple passenger types', () => {
    const result = parsePriceBreakdownString('ADT~2~143.00~252.92~0.00~0.00~395.92~0,CHD~1~107.00~162.92~0.00~0.00~269.92~0');
    expect(result).toHaveLength(2);
    expect(result[0].paxType).toBe('ADT');
    expect(result[1].paxType).toBe('CHD');
  });

  it('should handle empty string', () => {
    expect(parsePriceBreakdownString('')).toEqual([]);
  });

  it('should calculate per-person price', () => {
    const result = parsePriceBreakdownString('ADT~2~0~0~0~0~400.00~0');
    expect(result[0].pricePerPerson).toBe(200); // 400 / 2
  });
});

describe('normalizeAirportCode', () => {
  it('should normalize to uppercase', () => {
    expect(normalizeAirportCode('lhr')).toBe('LHR');
    expect(normalizeAirportCode('jfk')).toBe('JFK');
  });

  it('should trim whitespace', () => {
    expect(normalizeAirportCode('  LHR  ')).toBe('LHR');
    expect(normalizeAirportCode(' jfk ')).toBe('JFK');
  });

  it('should handle already normalized codes', () => {
    expect(normalizeAirportCode('LHR')).toBe('LHR');
  });
});
