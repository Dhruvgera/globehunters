import type { FlightLeg } from "@/components/booking/FlightSummaryCard";
import { flightTripLabel } from "@/lib/packages/tripLabels";

export type PackageProposalHotel = {
  name: string;
  imageSrc?: string;
  starRating?: number;
  address?: string;
  roomName?: string;
  roomHighlights?: string[];
  refundable?: boolean | null;
  amenities?: string[];
  reviewScore?: number;
  reviewLabel?: string;
  reviewCount?: number;
  rooms?: number;
};

export type PackageProposalActivity = {
  title: string;
  imageUrl?: string;
  date?: string;
  duration?: string;
  /** Supplier price in the package currency. Shown with the agent markup folded in. */
  price?: number;
};

export type PackageProposalDestination = {
  name: string;
  hotelCheckIn?: string;
  hotelCheckOut?: string;
  hotel?: PackageProposalHotel | null;
  activities: PackageProposalActivity[];
};

export type PackageProposalInput = {
  /** Supplier cost of the whole package (flights + stays + activities). */
  packageCost: number;
  /** Agent markup percentage. Folded into the customer total and never printed. */
  markupPercent: number;
  currency: string;
  adults: number;
  children?: number;
  infants?: number;
  flightLegs: FlightLeg[];
  destinations: PackageProposalDestination[];
  /** Departure city, e.g. "London". Falls back to the first flight's origin. */
  origin?: string;
  /** Local taxes paid to the hotel on arrival, already in the package currency. */
  payAtProperty?: number | null;
};

const NAVY: [number, number, number] = [1, 13, 80];
const BLUE: [number, number, number] = [55, 84, 237];
const MUTED: [number, number, number] = [58, 71, 138];
const BORDER: [number, number, number] = [223, 224, 228];
const SOFT: [number, number, number] = [245, 247, 255];
const GREEN: [number, number, number] = [0, 138, 91];

export function packageCustomerTotal(packageCost: number, markupPercent: number) {
  const markup = Math.max(0, Number(markupPercent) || 0);
  return Math.round(packageCost * (1 + markup / 100) * 100) / 100;
}

function normalizeCurrency(currency: string) {
  const raw = String(currency || "GBP").trim().toUpperCase();
  if (raw === "£") return "GBP";
  if (raw === "$") return "USD";
  if (raw === "€") return "EUR";
  return /^[A-Z]{3}$/.test(raw) ? raw : "GBP";
}

function pdfDate(value: string | undefined, fallback = "Date to be confirmed") {
  if (!value) return fallback;
  const date = new Date(`${value}T00:00:00`);
  if (Number.isNaN(date.getTime())) return fallback;
  return new Intl.DateTimeFormat("en-GB", { weekday: "short", day: "numeric", month: "short", year: "numeric" }).format(date);
}

function nightsBetween(checkIn?: string, checkOut?: string) {
  if (!checkIn || !checkOut) return 0;
  const start = new Date(`${checkIn}T00:00:00`).getTime();
  const end = new Date(`${checkOut}T00:00:00`).getTime();
  if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start) return 0;
  return Math.round((end - start) / 86_400_000);
}

function plural(count: number, noun: string, pluralNoun = `${noun}s`) {
  return `${count} ${count === 1 ? noun : pluralNoun}`;
}

type LoadedImage = { data: string; width: number; height: number };

function loadImageElement(src: string, timeoutMs = 8000) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const image = document.createElement("img");
    const timer = window.setTimeout(() => reject(new Error("Image timed out")), timeoutMs);
    image.crossOrigin = "anonymous";
    image.onload = () => {
      window.clearTimeout(timer);
      resolve(image);
    };
    image.onerror = () => {
      window.clearTimeout(timer);
      reject(new Error("Image failed to load"));
    };
    image.src = src;
  });
}

/**
 * Loads an image and returns a JPEG data URL cropped to the requested aspect ratio.
 * Remote images are fetched through Next's same-origin image optimizer first so the
 * canvas isn't tainted by CORS; a direct CORS load is the fallback.
 */
async function loadCoverImage(src: string | undefined, aspect: number, width: number): Promise<LoadedImage | null> {
  if (!src || typeof window === "undefined") return null;
  const candidates = /^(data:|blob:|\/(?!\/))/.test(src)
    ? [src]
    : /^https?:\/\//i.test(src)
      ? [`/_next/image?url=${encodeURIComponent(src)}&w=${width}&q=75`, src]
      : [];
  for (const candidate of candidates) {
    try {
      const image = await loadImageElement(candidate);
      const sourceWidth = image.naturalWidth;
      const sourceHeight = image.naturalHeight;
      if (!sourceWidth || !sourceHeight) continue;
      const outputWidth = Math.min(width, sourceWidth);
      const outputHeight = Math.round(outputWidth / aspect);
      const canvas = document.createElement("canvas");
      canvas.width = outputWidth;
      canvas.height = outputHeight;
      const context = canvas.getContext("2d");
      if (!context) continue;
      const sourceAspect = sourceWidth / sourceHeight;
      let cropWidth = sourceWidth;
      let cropHeight = sourceHeight;
      if (sourceAspect > aspect) cropWidth = sourceHeight * aspect;
      else cropHeight = sourceWidth / aspect;
      context.fillStyle = "#ffffff";
      context.fillRect(0, 0, outputWidth, outputHeight);
      context.drawImage(
        image,
        (sourceWidth - cropWidth) / 2,
        (sourceHeight - cropHeight) / 2,
        cropWidth,
        cropHeight,
        0,
        0,
        outputWidth,
        outputHeight
      );
      return { data: canvas.toDataURL("image/jpeg", 0.82), width: outputWidth, height: outputHeight };
    } catch {
      // Try the next candidate; a tainted canvas or blocked host just means no image.
    }
  }
  return null;
}

async function loadLogo(): Promise<LoadedImage | null> {
  if (typeof window === "undefined") return null;
  try {
    const image = await loadImageElement("/gh-logo.png");
    const canvas = document.createElement("canvas");
    canvas.width = image.naturalWidth * 2;
    canvas.height = image.naturalHeight * 2;
    const context = canvas.getContext("2d");
    if (!context) return null;
    context.drawImage(image, 0, 0, canvas.width, canvas.height);
    return { data: canvas.toDataURL("image/png"), width: canvas.width, height: canvas.height };
  } catch {
    return null;
  }
}

export function packageProposalFileName(destinations: Array<{ name: string }>) {
  const slug = destinations
    .map((destination) => destination.name)
    .join("-")
    .replace(/[^a-z0-9-]+/gi, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .toLowerCase();
  return `globehunters-${slug || "holiday"}.pdf`;
}

/** Builds the customer-facing itinerary PDF. Agent markup is baked into the total only. */
export async function buildPackageProposalPdf(input: PackageProposalInput): Promise<Blob> {
  const { jsPDF } = await import("jspdf");
  const pdf = new jsPDF({ unit: "mm", format: "a4" });
  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  const margin = 16;
  const contentWidth = pageWidth - margin * 2;
  const bottomLimit = pageHeight - 18;
  const currency = normalizeCurrency(input.currency);
  const customerTotal = packageCustomerTotal(input.packageCost, input.markupPercent);
  const payAtProperty = Math.max(0, Math.round((Number(input.payAtProperty) || 0) * 100) / 100);
  const money = (value: number) =>
    new Intl.NumberFormat("en-GB", { style: "currency", currency, minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(value);
  const travellersLabel = [
    plural(input.adults, "adult"),
    input.children ? plural(input.children, "child", "children") : "",
    input.infants ? plural(input.infants, "infant") : "",
  ].filter(Boolean).join(", ");
  const destinations = input.destinations.filter((destination) => destination.name);
  const allActivities = destinations.flatMap((destination) => destination.activities);
  const activitiesCost = allActivities.reduce((sum, activity) => sum + (activity.price && activity.price > 0 ? activity.price : 0), 0);
  const origin = input.origin?.trim() || input.flightLegs[0]?.from || input.flightLegs[0]?.fromCode || "";
  const destinationNames = destinations.map((destination) => destination.name).join("  ·  ");
  const tripStart = destinations[0]?.hotelCheckIn || input.flightLegs[0]?.date;
  const tripEnd = destinations.at(-1)?.hotelCheckOut || input.flightLegs.at(-1)?.arrivalDate || input.flightLegs.at(-1)?.date;

  const HOTEL_ASPECT = 3 / 2;
  const ACTIVITY_ASPECT = 4 / 3;
  const [logo, hotelImages, activityImages] = await Promise.all([
    loadLogo(),
    Promise.all(destinations.map((destination) => loadCoverImage(destination.hotel?.imageSrc, HOTEL_ASPECT, 828))),
    Promise.all(allActivities.map((activity) => loadCoverImage(activity.imageUrl, ACTIVITY_ASPECT, 384))),
  ]);

  let y = 0;
  const setText = (size: number, color: [number, number, number], style: "normal" | "bold" = "normal") => {
    pdf.setFont("helvetica", style);
    pdf.setFontSize(size);
    pdf.setTextColor(...color);
  };
  const ensureRoom = (height: number) => {
    if (y + height <= bottomLimit) return;
    pdf.addPage();
    y = 18;
  };
  const sectionTitle = (label: string) => {
    ensureRoom(16);
    setText(14, NAVY, "bold");
    pdf.text(label, margin, y);
    y += 3;
    pdf.setDrawColor(...BLUE);
    pdf.setLineWidth(0.6);
    pdf.line(margin, y, margin + 14, y);
    pdf.setLineWidth(0.2);
    y += 6;
  };
  const wrap = (text: string, width: number) => pdf.splitTextToSize(text, width) as string[];
  const includedPill = (x: number, top: number) => {
    setText(8, GREEN, "bold");
    const label = "INCLUDED";
    const width = pdf.getTextWidth(label) + 5;
    pdf.setFillColor(230, 246, 239);
    pdf.roundedRect(x - width, top, width, 5.5, 1.5, 1.5, "F");
    pdf.text(label, x - width / 2, top + 3.9, { align: "center" });
  };

  // Header
  if (logo) {
    const logoHeight = 9;
    pdf.addImage(logo.data, "PNG", margin, 12, (logo.width / logo.height) * logoHeight, logoHeight);
  } else {
    setText(18, NAVY, "bold");
    pdf.text("Globehunters", margin, 19);
  }
  setText(8, MUTED);
  pdf.text(
    `Prepared ${new Intl.DateTimeFormat("en-GB", { dateStyle: "medium" }).format(new Date())}`,
    pageWidth - margin,
    17,
    { align: "right" }
  );
  y = 30;
  pdf.setFillColor(...NAVY);
  pdf.roundedRect(margin, y, contentWidth, 34, 3, 3, "F");
  setText(9, [200, 208, 255]);
  pdf.text("YOUR HOLIDAY ITINERARY", margin + 7, y + 8);
  setText(18, [255, 255, 255], "bold");
  const tripTitle = origin && destinationNames ? `${origin} to ${destinationNames}` : destinationNames || "Your trip";
  const titleLines = wrap(tripTitle, contentWidth - 14).slice(0, 2);
  pdf.text(titleLines, margin + 7, y + 16);
  setText(9.5, [220, 226, 255]);
  pdf.text(
    `${pdfDate(tripStart, "Dates to be confirmed")} – ${pdfDate(tripEnd, "")}   ·   ${travellersLabel}`,
    margin + 7,
    y + 16 + titleLines.length * 7
  );
  y += 44;

  // Trip total, mirroring the website summary
  const totalBoxHeight = 30 + (allActivities.length > 0 ? 6 : 0) + (payAtProperty > 0 ? 12 : 0);
  pdf.setFillColor(...SOFT);
  pdf.setDrawColor(...BORDER);
  pdf.roundedRect(margin, y, contentWidth, totalBoxHeight, 3, 3, "FD");
  setText(10, MUTED);
  pdf.text("Trip total", margin + 7, y + 8);
  setText(22, NAVY, "bold");
  pdf.text(money(customerTotal + payAtProperty), margin + 7, y + 18);
  setText(9, MUTED);
  pdf.text(`For ${travellersLabel}`, margin + 7, y + 24.5);
  if (payAtProperty > 0) {
    const payAtPropertyLabel = `Pay at check-in: ${money(payAtProperty)}`;
    setText(9, NAVY);
    pdf.text(`Pay now: ${money(customerTotal)}`, margin + 7, y + 31);
    pdf.text(payAtPropertyLabel, margin + 7, y + 36.5);
    const payAtPropertyLabelWidth = pdf.getTextWidth(payAtPropertyLabel);
    setText(7.5, MUTED);
    pdf.text("Local fees payable at the property", margin + 7 + payAtPropertyLabelWidth + 3, y + 36.5);
  }
  const includedRows: Array<{ label: string; amount?: number }> = [
    { label: input.flightLegs.length > 0 && destinations.some((destination) => destination.hotel) ? "Flights and stays" : input.flightLegs.length > 0 ? "Flights" : "Stays" },
    ...(allActivities.length > 0
      ? [{ label: `Activities (${allActivities.length})`, amount: activitiesCost > 0 ? packageCustomerTotal(activitiesCost, input.markupPercent) : undefined }]
      : []),
    { label: "Taxes and fees" },
  ];
  includedRows.forEach((row, index) => {
    const rowY = y + 8 + index * 6.5;
    setText(9.5, NAVY);
    pdf.text(row.label, pageWidth - margin - 44, rowY, { align: "right" });
    if (row.amount) {
      setText(9.5, NAVY, "bold");
      pdf.text(money(row.amount), pageWidth - margin - 7, rowY, { align: "right" });
    } else {
      includedPill(pageWidth - margin - 7, rowY - 3.9);
    }
  });
  y += totalBoxHeight + 10;

  // Flights
  if (input.flightLegs.length > 0) {
    sectionTitle("Flights");
    input.flightLegs.forEach((leg, index) => {
      ensureRoom(26);
      pdf.setDrawColor(...BORDER);
      pdf.roundedRect(margin, y, contentWidth, 22, 2.5, 2.5, "S");
      setText(8, MUTED, "bold");
      pdf.text(`FLIGHT ${index + 1}  ·  ${pdfDate(leg.date, leg.date || "")}`.toUpperCase(), margin + 5, y + 6);
      setText(8, MUTED);
      pdf.text(`${leg.airline}${leg.cabinClass && leg.cabinClass.length > 1 ? ` · ${leg.cabinClass}` : ""}`, pageWidth - margin - 5, y + 6, { align: "right" });
      setText(15, NAVY, "bold");
      pdf.text(leg.departureTime || "--:--", margin + 5, y + 14);
      pdf.text(leg.arrivalTime || "--:--", pageWidth - margin - 5, y + 14, { align: "right" });
      setText(9, MUTED);
      pdf.text(leg.fromCode, margin + 5, y + 19);
      pdf.text(leg.toCode, pageWidth - margin - 5, y + 19, { align: "right" });
      const middle = pageWidth / 2;
      pdf.setDrawColor(...BORDER);
      pdf.setLineDashPattern([1, 1], 0);
      pdf.line(margin + 32, y + 13, pageWidth - margin - 32, y + 13);
      pdf.setLineDashPattern([], 0);
      setText(8.5, NAVY, "bold");
      pdf.text(leg.duration || "", middle, y + 10.5, { align: "center" });
      setText(8, MUTED);
      pdf.text(leg.stops || "", middle, y + 18, { align: "center" });
      const fromName = wrap(leg.from, 50)[0] || "";
      const toName = wrap(leg.to, 50)[0] || "";
      pdf.text(fromName, margin + 14, y + 19);
      pdf.text(toName, pageWidth - margin - 14, y + 19, { align: "right" });
      y += 26;
    });
    y += 4;
  }

  // Stays and activities per destination
  let activityIndex = 0;
  destinations.forEach((destination, destinationIndex) => {
    const nights = nightsBetween(destination.hotelCheckIn, destination.hotelCheckOut);
    sectionTitle(destinations.length > 1 ? `Stay ${destinationIndex + 1}: ${destination.name}` : `Your stay in ${destination.name}`);
    const hotel = destination.hotel;
    if (!hotel) {
      setText(10, MUTED);
      pdf.text("Hotel to be confirmed.", margin, y);
      y += 8;
    } else {
      const image = hotelImages[destinationIndex];
      const imageWidth = image ? 66 : 0;
      const imageHeight = imageWidth / HOTEL_ASPECT;
      const textX = margin + (image ? imageWidth + 6 : 0);
      const textWidth = contentWidth - (image ? imageWidth + 6 : 0);
      const details: Array<{ text: string; size: number; color: [number, number, number]; style?: "bold" }> = [];
      const nameLines = wrap(hotel.name, textWidth - 26);
      const meta = [
        hotel.starRating ? `${hotel.starRating}-star hotel` : "",
        hotel.reviewScore ? `Guest rating ${hotel.reviewScore.toFixed(1)}${hotel.reviewLabel ? ` ${hotel.reviewLabel}` : ""}${hotel.reviewCount ? ` (${hotel.reviewCount} reviews)` : ""}` : "",
      ].filter(Boolean).join("  ·  ");
      if (meta) details.push({ text: meta, size: 8.5, color: MUTED });
      if (hotel.address) wrap(hotel.address, textWidth).slice(0, 2).forEach((text) => details.push({ text, size: 8.5, color: MUTED }));
      details.push({
        text: `${pdfDate(destination.hotelCheckIn)} – ${pdfDate(destination.hotelCheckOut)}${nights ? ` · ${plural(nights, "night")}` : ""}${hotel.rooms ? ` · ${plural(hotel.rooms, "room")}` : ""}`,
        size: 9,
        color: NAVY,
        style: "bold",
      });
      if (hotel.roomName) wrap(hotel.roomName, textWidth).slice(0, 2).forEach((text) => details.push({ text, size: 9, color: NAVY }));
      const highlights = [
        ...(hotel.roomHighlights || []),
        typeof hotel.refundable === "boolean" ? (hotel.refundable ? "Refundable" : "Non-refundable") : "",
      ].filter((value, index, list) => value && list.indexOf(value) === index);
      if (highlights.length) wrap(highlights.join(" · "), textWidth).slice(0, 2).forEach((text) => details.push({ text, size: 8.5, color: MUTED }));
      if (hotel.amenities?.length) wrap(`Amenities: ${hotel.amenities.slice(0, 8).join(", ")}`, textWidth).slice(0, 2).forEach((text) => details.push({ text, size: 8.5, color: MUTED }));

      const textHeight = nameLines.length * 5.5 + details.reduce((sum, detail) => sum + detail.size * 0.5, 0) + 2;
      const blockHeight = Math.max(imageHeight, textHeight) + 8;
      ensureRoom(blockHeight + 2);
      pdf.setDrawColor(...BORDER);
      pdf.roundedRect(margin - 2, y - 2, contentWidth + 4, blockHeight, 2.5, 2.5, "S");
      if (image) pdf.addImage(image.data, "JPEG", margin + 2, y + 2, imageWidth - 4, (imageWidth - 4) / HOTEL_ASPECT);
      let textY = y + 5;
      setText(12, NAVY, "bold");
      pdf.text(nameLines, textX, textY);
      includedPill(pageWidth - margin - 2, y + 1);
      textY += nameLines.length * 5.5;
      details.forEach((detail) => {
        setText(detail.size, detail.color, detail.style || "normal");
        pdf.text(detail.text, textX, textY);
        textY += detail.size * 0.5;
      });
      y += blockHeight + 4;
    }

    if (destination.activities.length > 0) {
      ensureRoom(12);
      setText(11, NAVY, "bold");
      pdf.text(`Activities in ${destination.name}`, margin, y + 2);
      y += 7;
      destination.activities.forEach((activity) => {
        const image = activityImages[activityIndex];
        activityIndex += 1;
        const thumbWidth = image ? 28 : 0;
        const thumbHeight = thumbWidth / ACTIVITY_ASPECT;
        const textX = margin + (image ? thumbWidth + 5 : 0);
        const titleLines = wrap(activity.title, contentWidth - (image ? thumbWidth + 5 : 0) - 26).slice(0, 3);
        const rowHeight = Math.max(thumbHeight, titleLines.length * 4.8 + 6) + 4;
        ensureRoom(rowHeight);
        if (image) pdf.addImage(image.data, "JPEG", margin, y, thumbWidth, thumbHeight);
        setText(10, NAVY, "bold");
        pdf.text(titleLines, textX, y + 4);
        setText(8.5, MUTED);
        pdf.text(
          [pdfDate(activity.date), activity.duration].filter(Boolean).join(" · "),
          textX,
          y + 4 + titleLines.length * 4.8
        );
        if (activity.price && activity.price > 0) {
          setText(10, NAVY, "bold");
          pdf.text(money(packageCustomerTotal(activity.price, input.markupPercent)), pageWidth - margin, y + 4, { align: "right" });
        } else {
          includedPill(pageWidth - margin, y);
        }
        y += rowHeight;
        pdf.setDrawColor(238, 240, 246);
        pdf.line(margin, y - 2, pageWidth - margin, y - 2);
      });
      y += 4;
    }
  });

  // What's included
  sectionTitle("What's included");
  const totalNights = destinations.reduce((sum, destination) => sum + nightsBetween(destination.hotelCheckIn, destination.hotelCheckOut), 0);
  const inclusions = [
    input.flightLegs.length > 0 ? `${flightTripLabel(input.flightLegs.length)} for ${travellersLabel}` : "",
    destinations.some((destination) => destination.hotel)
      ? `${totalNights ? `${plural(totalNights, "night")} of ` : ""}hotel accommodation${destinations.length > 1 ? ` across ${plural(destinations.length, "destination")}` : ""}`
      : "",
    allActivities.length > 0
      ? `${plural(allActivities.length, "activity", "activities")}${activitiesCost > 0 ? ` (${money(packageCustomerTotal(activitiesCost, input.markupPercent))})` : ""}`
      : "",
    payAtProperty > 0 ? `Taxes and fees, except ${money(payAtProperty)} local fees payable at the property` : "All taxes and fees",
  ].filter(Boolean);
  inclusions.forEach((item) => {
    ensureRoom(7);
    pdf.setFillColor(...GREEN);
    pdf.circle(margin + 1.5, y - 1.2, 1.1, "F");
    setText(10, NAVY);
    pdf.text(item, margin + 6, y);
    y += 6;
  });
  y += 4;
  ensureRoom(14);
  setText(8, MUTED);
  pdf.text(
    wrap("Prices and availability are live and may change until your booking is confirmed. Hotel and activity images are supplied by our partners and are for illustration.", contentWidth),
    margin,
    y
  );

  const pageCount = pdf.getNumberOfPages();
  for (let pageNumber = 1; pageNumber <= pageCount; pageNumber += 1) {
    pdf.setPage(pageNumber);
    pdf.setDrawColor(...BORDER);
    pdf.line(margin, pageHeight - 12, pageWidth - margin, pageHeight - 12);
    setText(7.5, MUTED);
    pdf.text("Globehunters · www.globehunters.com", margin, pageHeight - 7.5);
    pdf.text(`Page ${pageNumber} of ${pageCount}`, pageWidth - margin, pageHeight - 7.5, { align: "right" });
  }

  return pdf.output("blob");
}
