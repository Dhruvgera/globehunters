import { parseStarRating, stableRateId } from '@/lib/hotelbeds/mappers';

describe('hotelbeds mappers', () => {
  it('parses star rating from categoryName', () => {
    expect(parseStarRating('3 STARS')).toBe(3);
    expect(parseStarRating('5 STAR')).toBe(5);
    expect(parseStarRating('UNKNOWN')).toBe(3);
  });

  it('generates stable short ids from rateKey', () => {
    const a = stableRateId('rateKey-1');
    const b = stableRateId('rateKey-1');
    const c = stableRateId('rateKey-2');
    expect(a).toEqual(b);
    expect(a).not.toEqual(c);
    expect(a).toHaveLength(12);
  });
});

