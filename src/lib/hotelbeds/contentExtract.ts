export interface HotelbedsContentEnrichment {
  imagePath?: string;
  address1?: string;
  cityName?: string;
  countryName?: string;
  categoryName?: string;
}

export interface HotelbedsContentDetailsExtract {
  description?: string;
  hotelImages: string[]; // image paths
  roomImages: Record<string, string[]>; // roomCode -> image paths
  amenities: string[]; // best-effort, human labels
  categoryName?: string;
}

function firstStringCandidate(values: unknown[]): string | undefined {
  for (const v of values) {
    const s = typeof v === 'string' ? v.trim() : '';
    if (s) return s;
  }
  return undefined;
}

export function extractHotelbedsContentEnrichment(raw: any): HotelbedsContentEnrichment {
  const hotel = raw?.hotel ?? raw;

  const categoryName =
    firstStringCandidate([
      hotel?.categoryName,
      hotel?.category?.description?.content,
      hotel?.category?.content,
      hotel?.category?.name,
    ]) || undefined;

  const address1 =
    firstStringCandidate([
      hotel?.address?.content,
      hotel?.address,
      hotel?.postalCode?.content ? `${hotel?.postalCode?.content}` : '',
    ]) || undefined;

  const cityName =
    firstStringCandidate([hotel?.city?.content, hotel?.city?.name, hotel?.city]) || undefined;

  const countryName =
    firstStringCandidate([
      hotel?.country?.description?.content,
      hotel?.country?.name,
      hotel?.country,
    ]) || undefined;

  // Images can appear in different shapes depending on endpoint/version.
  const imagesRaw = hotel?.images;
  const images = Array.isArray(imagesRaw)
    ? imagesRaw
    : Array.isArray(imagesRaw?.image)
      ? imagesRaw.image
      : [];

  const firstWithPath = images.find((x: any) => x?.path) || images[0];
  const imagePath = firstWithPath?.path ? String(firstWithPath.path).replace(/^\/+/, '') : undefined;

  return { imagePath, address1, cityName, countryName, categoryName };
}

function looksLikeAmenityLabel(label: string): boolean {
  const s = label.toLowerCase();
  // Fast exclusions for operational/metadata fields that aren't user-facing amenities.
  const exclude = [
    'year of',
    'number of',
    'construction',
    'renovation',
    'floor',
    'floors',
    'check-in',
    'check out',
    'check-out',
    'credit card',
    'visa',
    'mastercard',
    'american express',
    'deposit',
    'tax',
    'distance',
    'hours',
    'opening',
    'closing',
    'age',
    'minimum',
    'maximum',
  ];
  if (exclude.some((k) => s.includes(k))) return false;

  const include = [
    'wifi',
    'internet',
    'pool',
    'parking',
    'gym',
    'fitness',
    'spa',
    'sauna',
    'steam',
    'restaurant',
    'bar',
    'breakfast',
    'air conditioning',
    'a/c',
    'shuttle',
    'airport',
    'lift',
    'elevator',
    'wheelchair',
    'accessible',
    'pets',
    'pet',
    'family',
    'kids',
    'beach',
    'room service',
    'laundry',
    'front desk',
    '24-hour',
    '24h',
  ];
  return include.some((k) => s.includes(k));
}

export function extractHotelbedsContentDetails(raw: any): HotelbedsContentDetailsExtract {
  const hotel = raw?.hotel ?? raw;

  const description =
    firstStringCandidate([hotel?.description?.content, hotel?.description]) || undefined;

  const categoryName =
    firstStringCandidate([
      hotel?.categoryName,
      hotel?.category?.description?.content,
      hotel?.category?.content,
      hotel?.category?.name,
    ]) || undefined;

  const imagesRaw = hotel?.images;
  const images = Array.isArray(imagesRaw)
    ? imagesRaw
    : Array.isArray(imagesRaw?.image)
      ? imagesRaw.image
      : [];

  const hotelImages: string[] = [];
  const roomImages: Record<string, string[]> = {};
  for (const img of images) {
    const path = img?.path ? String(img.path).replace(/^\/+/, '') : '';
    if (!path) continue;
    const roomCode = img?.roomCode ? String(img.roomCode) : '';
    if (roomCode) {
      if (!roomImages[roomCode]) roomImages[roomCode] = [];
      if (roomImages[roomCode]!.length < 8) roomImages[roomCode]!.push(path);
    } else {
      if (hotelImages.length < 24) hotelImages.push(path);
    }
  }

  // Facilities => amenities (best-effort via keyword filtering)
  const amenitiesSet = new Set<string>();
  const facilities = Array.isArray(hotel?.facilities) ? hotel.facilities : [];
  for (const f of facilities) {
    const label = firstStringCandidate([f?.description?.content, f?.description]) || '';
    if (!label) continue;
    if (!looksLikeAmenityLabel(label)) continue;
    amenitiesSet.add(label);
    if (amenitiesSet.size >= 40) break;
  }

  return {
    description,
    hotelImages,
    roomImages,
    amenities: Array.from(amenitiesSet),
    categoryName,
  };
}
