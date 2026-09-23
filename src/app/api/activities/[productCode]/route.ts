import { NextResponse } from "next/server";
import { getViatorAvailabilityDates, getViatorProduct } from "@/lib/viator/client";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ productCode: string }> }
) {
  try {
    const { productCode } = await params;
    const url = new URL(request.url);
    const startDate = url.searchParams.get("startDate");
    const endDate = url.searchParams.get("endDate");

    if (startDate && endDate) {
      const availableDates = await getViatorAvailabilityDates(productCode, startDate, endDate);
      return NextResponse.json({ productCode, availableDates });
    }

    const product = await getViatorProduct(productCode);

    if (!product) {
      return NextResponse.json(
        { error: "NOT_FOUND", message: "Activity product not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ product });
  } catch (error) {
    console.error("[ActivityProduct] Error:", error);
    return NextResponse.json(
      {
        error: "VIATOR_PRODUCT_FAILED",
        message: error instanceof Error ? error.message : "Failed to load activity product",
      },
      { status: 500 }
    );
  }
}
