import { Flight } from "@/types/flight";
import { formatPrice } from "./currency";

export interface ShareData {
  title: string;
  text: string;
  url: string;
}

export interface ShareOptions {
  whatsapp?: boolean;
  email?: boolean;
  copy?: boolean;
}

/**
 * Generate share data for a flight
 */
export function generateFlightShareData(flight: Flight): ShareData {
  const departureDate = flight.outbound?.date
    ? flight.outbound.date
    : '';

  const returnDate = flight.inbound?.date
    ? flight.inbound.date
    : '';

  const route = `${flight.outbound?.departureAirport?.code || ''} → ${flight.outbound?.arrivalAirport?.code || ''}`;
  const airline = flight.airline?.name || 'Flight';

  const title = `Great flight deal: ${route} - ${formatPrice(flight.pricePerPerson, flight.currency)}`;

  const text = flight.inbound
    ? `${airline}: ${route} (${departureDate} - ${returnDate})\nPrice: ${formatPrice(flight.pricePerPerson, flight.currency)} per person\nFound on GlobeHunters`
    : `${airline}: ${route} (${departureDate})\nPrice: ${formatPrice(flight.pricePerPerson, flight.currency)} per person\nFound on GlobeHunters`;

  const url = typeof window !== 'undefined' ? window.location.href : '';

  return {
    title,
    text,
    url
  };
}

/**
 * Check if Web Share API is supported
 */
export function isWebShareSupported(): boolean {
  return typeof navigator !== 'undefined' && 'share' in navigator;
}

/**
 * Share using Web Share API (for mobile devices)
 */
export async function shareWithWebAPI(data: ShareData): Promise<boolean> {
  if (!isWebShareSupported()) {
    return false;
  }

  try {
    await navigator.share(data);
    return true;
  } catch (error) {
    // User cancelled or error occurred
    console.log('Web Share API error:', error);
    return false;
  }
}

/**
 * Share via WhatsApp
 */
export function shareViaWhatsApp(data: ShareData): void {
  const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(`${data.text}\n\n${data.url}`)}`;
  window.open(whatsappUrl, '_blank', 'noopener,noreferrer');
}

/**
 * Share via Email
 */
export function shareViaEmail(data: ShareData): void {
  const subject = encodeURIComponent(data.title);
  const body = encodeURIComponent(`${data.text}\n\n${data.url}`);
  const emailUrl = `mailto:?subject=${subject}&body=${body}`;
  window.open(emailUrl, '_blank', 'noopener,noreferrer');
}

/**
 * Copy share text to clipboard
 */
export async function copyToClipboard(data: ShareData): Promise<boolean> {
  try {
    const shareText = `${data.text}\n\n${data.url}`;
    await navigator.clipboard.writeText(shareText);
    return true;
  } catch (error) {
    console.error('Failed to copy to clipboard:', error);
    return false;
  }
}

/**
 * Handle sharing with automatic fallback
 */
export async function shareFlight(flight: Flight, options: ShareOptions = {}): Promise<void> {
  const shareData = generateFlightShareData(flight);

  // Try Web Share API first (mobile)
  if (isWebShareSupported()) {
    const shared = await shareWithWebAPI(shareData);
    if (shared) return;
  }

  // Fallback to specific sharing methods
  if (options.whatsapp) {
    shareViaWhatsApp(shareData);
  } else if (options.email) {
    shareViaEmail(shareData);
  } else if (options.copy) {
    await copyToClipboard(shareData);
  }
}
